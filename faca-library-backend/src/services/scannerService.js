/**
 * scannerService.js — Quét file PowerPoint (.ppt / .pptx) từ các thư mục OneDrive local
 * được cấu hình trong dbo.SyncFolders, phân loại lỗi (EE / OE / ME) rồi cache vào
 * dbo.PresentationReports để giao diện "Quản lý Lỗi" tra cứu nhanh.
 *
 * Luồng: SyncFolders (is_active = 1) → quét đệ quy folder_path → phân loại category_code
 *        → dựng link TRỰC TIẾP tới file → UPSERT vào PresentationReports theo full_local_path.
 *
 * Link trực tiếp (xem buildDirectPowerPointUrls) — click trên web là mở đúng file .pptx:
 *   - sharepoint_web_url : PowerPoint Online trong trình duyệt (.../Documents/<du_an>/<file>.pptx?web=1)
 *   - powerpoint_app_url : ứng dụng PowerPoint trên máy, qua protocol handler
 *                          ms-powerpoint:ofe|u|<url file> (không kèm ?web=1)
 * Cấu hình tenant (SHAREPOINT_TENANT_BASE) + gốc OneDrive (ONEDRIVE_SYNC_ROOT) lấy từ .env.
 * Thư mục con là THƯ MỤC ĐƯỢC CHIA SẺ (shortcut trên OneDrive của người khác) thì đường dẫn trên
 * web KHÁC tên thư mục trên máy → phải khai báo ánh xạ trong bảng dbo.SyncFolderMappings
 * (hoặc SHAREPOINT_PATH_MAP trong .env), xem loadPathMappings.
 *
 * Ghi chú kỹ thuật:
 *  - Chỉ dùng module `fs`/`path` có sẵn của Node (không cần thêm thư viện glob).
 *  - So khớp từ khóa trên chuỗi đã BỎ DẤU tiếng Việt + tách token, nên cả
 *    "Lỗi điện", "Loi_Dien" và "LOI DIEN" đều nhận diện giống nhau.
 *  - Từ khóa ngắn (ee, oe, me, co, uv, gap...) chỉ so khớp theo TOKEN (nguyên từ)
 *    để tránh bắt nhầm các từ tiếng Anh như "config", "copy", "company" → LOI_CO.
 *  - Bảng PresentationReports.folder_id có FK tới SyncFolders.folder_id nên folder
 *    luôn được bảo đảm tồn tại trước khi insert report.
 */
const fs = require('fs');
const path = require('path');
const { poolPromise, sql } = require('../config/db');

// Phần mở rộng file PowerPoint được quét
const SLIDE_EXTENSIONS = ['.ppt', '.pptx'];

// Giới hạn độ sâu đệ quy (tránh lặp vô hạn nếu thư mục sync có junction/shortcut)
const MAX_SCAN_DEPTH = 12;

// Danh mục lỗi hợp lệ (khớp với filter của GET /api/reports)
const CATEGORY_CODES = ['LOI_DIEN', 'LOI_QUANG', 'LOI_CO', 'KHAC'];

/**
 * Bộ từ khóa nhận diện danh mục lỗi.
 *  - tokens: so khớp nguyên từ (an toàn cho các từ khóa ngắn, dễ trùng)
 *  - words : so khớp chuỗi con (các từ dài, ít khả năng trùng)
 * Thứ tự mảng = thứ tự ưu tiên khi phân loại (EE → OE → ME).
 */
const CATEGORY_RULES = [
    {
        code: 'LOI_DIEN',
        tokens: ['ee', 'dien', 'esd'],
        words: ['short', 'voltage', 'power', 'circuit', 'soldering', 'capacitor', 'ldo', 'ovp', 'pmic', 'overheat'],
    },
    {
        code: 'LOI_QUANG',
        tokens: ['oe', 'quang', 'uv'],
        words: ['lens', 'optical', 'blur', 'sensor', 'laser', 'cmos'],
    },
    {
        code: 'LOI_CO',
        tokens: ['me', 'co', 'gap'],
        words: ['mechanical', 'housing', 'crack', 'screw', 'mold', 'vibration', 'warp'],
    },
];

// ================= CẤU HÌNH LINK TRỰC TIẾP TỚI FILE POWERPOINT =================
// Base URL site OneDrive for Business (SharePoint tenant) — dùng để dựng link TRỰC TIẾP:
//   https://<tenant>-my.sharepoint.com/personal/<user>/Documents
// GHI ĐÈ bằng biến môi trường SHAREPOINT_TENANT_BASE (xem .env).
const SHAREPOINT_TENANT_BASE = (
    process.env.SHAREPOINT_TENANT_BASE ||
    'https://vnuaeduvn-my.sharepoint.com/personal/671279_sv_vnua_edu_vn/Documents'
)
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

// Thư mục gốc OneDrive local (thư mục cha chứa các thư mục dự án).
// Để trống → tự dùng path.dirname(folder_path) của dòng SyncFolders đang quét.
const ONEDRIVE_SYNC_ROOT = String(process.env.ONEDRIVE_SYNC_ROOT || '').trim();

// Bảng ánh xạ đường dẫn LOCAL → URL REMOTE, dùng cho các thư mục con không nằm trong OneDrive
// của chính người dùng (thư mục được chia sẻ / shortcut). Trên web chúng nằm ở site khác và
// thường mang tên khác tên thư mục trên máy, nên không thể ghép URL chỉ bằng đường dẫn local.
//   VD: C:\...\PSM27_Library\Tệp của Phạm Trung Hiếu - ME
//       ↔ https://vnuaeduvn-my.sharepoint.com/personal/671445_sv_vnua_edu_vn/Documents/PSM27 Library/ME
const MAPPINGS_TABLE = 'dbo.SyncFolderMappings';

// Cấu hình mặc định cho dự án PSM27_Library (dùng khi bảng SyncFolders chưa có dòng active nào)
const DEFAULT_SYNC_FOLDER = {
    projectName: process.env.ONEDRIVE_PROJECT_NAME || 'PSM27_Library',
    folderPath: process.env.ONEDRIVE_LIBRARY_ROOT || 'C:\\Users\\laptop\\OneDrive - vnua.edu.vn\\PSM27_Library',
    // Để trống → resolveDirectPrefix() tự suy ra link trực tiếp từ SHAREPOINT_TENANT_BASE
    // + đường dẫn thư mục dự án (thay vì hard-code link trang chủ OneDrive như trước).
    sharepointPrefix: process.env.SHAREPOINT_URL_PREFIX || '',
};

/**
 * Chuẩn hóa text để so khớp từ khóa: bỏ dấu tiếng Việt, viết thường,
 * mọi ký tự không phải chữ/số chuyển thành khoảng trắng.
 * VD: "Tệp của Phạm Trung Hiếu - EE" → "tep cua pham trung hieu ee"
 */
const normalizeText = (value = '') =>
    String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

/**
 * Phân loại danh mục lỗi dựa trên tên file và tên thư mục chứa nó.
 * @param {string} text — thường là relative_path của file
 * @returns {'LOI_DIEN'|'LOI_QUANG'|'LOI_CO'|'KHAC'}
 */
const classifyCategory = (text = '') => {
    const normalized = normalizeText(text);
    if (!normalized) return 'KHAC';

    const padded = ` ${normalized} `;
    const tokens = new Set(normalized.split(' '));

    for (const rule of CATEGORY_RULES) {
        if (rule.tokens.some((token) => tokens.has(token))) return rule.code;
        if (rule.words.some((word) => padded.includes(word))) return rule.code;
    }
    return 'KHAC';
};

/** Đổi dấu \ thành / (đường dẫn Windows → dạng dùng được cho URL). */
const toSlashes = (value = '') => String(value).replace(/\\/g, '/');

/** Chuẩn hóa prefix URL: bỏ khoảng trắng thừa, dấu \ và mọi dấu / ở cuối. */
const normalizePrefix = (value = '') => toSlashes(value).trim().replace(/\/+$/, '');

/**
 * Encode phần PATH của một URL (khoảng trắng, ký tự có dấu...) nhưng giữ nguyên scheme + host.
 * Cần thiết vì URL còn được truyền qua protocol handler ms-powerpoint:ofe|u|<url> — khoảng trắng
 * trong đường dẫn có thể làm app hiểu sai địa chỉ.
 * Đoạn đã encode sẵn (có dấu %) được giữ nguyên để tránh encode 2 lần.
 */
const encodeUrlPath = (value = '') => {
    const text = toSlashes(value).trim();
    if (!text) return '';

    const match = text.match(/^([a-z][a-z0-9+.-]*:\/\/[^/]+)(\/.*)?$/i);
    if (!match) return text;

    const origin = match[1];
    const encodedPath = (match[2] || '')
        .split('/')
        .map((segment) => (segment.includes('%') ? segment : encodeURIComponent(segment)))
        .join('/');

    return `${origin}${encodedPath}`;
};

/** Encode từng đoạn của đường dẫn tương đối để ghép vào URL (giữ nguyên dấu /). */
const encodePathSegments = (relativePath = '') =>
    toSlashes(relativePath)
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');

// ================= ÁNH XẠ ĐƯỜNG DẪN LOCAL → URL REMOTE =================

/** Chuẩn hoá đường dẫn con để so khớp: bỏ \ ở đầu/cuối, dùng /, viết thường. */
const normalizeSubpath = (value = '') =>
    toSlashes(String(value))
        .replace(/^\/+|\/+$/g, '')
        .toLowerCase();

/**
 * Đọc cấu hình ánh xạ từ biến môi trường SHAREPOINT_PATH_MAP (JSON) — dùng khi không muốn
 * (hoặc chưa kịp) ghi vào bảng dbo.SyncFolderMappings.
 * VD: SHAREPOINT_PATH_MAP=[{"local":"Tệp của Phạm Trung Hiếu - ME","remote":"https://.../Documents/PSM27 Library/ME"}]
 */
const parseEnvPathMap = () => {
    const raw = String(process.env.SHAREPOINT_PATH_MAP || '').trim();
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('giá trị phải là mảng JSON');

        return parsed
            .map((item) => ({
                folderId: null,
                localSubpath: String(item?.local ?? item?.local_subpath ?? '').trim(),
                remoteUrlPrefix: String(item?.remote ?? item?.remote_url_prefix ?? '').trim(),
                note: 'SHAREPOINT_PATH_MAP (.env)',
            }))
            .filter((item) => item.localSubpath && item.remoteUrlPrefix);
    } catch (error) {
        console.warn(`⚠️  SHAREPOINT_PATH_MAP trong .env không hợp lệ, bỏ qua: ${error.message}`);
        return [];
    }
};

/**
 * Nạp danh sách ánh xạ đang bật: bảng dbo.SyncFolderMappings (nguồn chính) + SHAREPOINT_PATH_MAP
 * trong .env (ghi đè khi trùng local_subpath). Bảng chưa tồn tại (DB cũ) → chỉ dùng .env.
 * @returns {Promise<Array<{folderId: number|null, localSubpath: string, remoteUrlPrefix: string, note: string}>>}
 */
const loadPathMappings = async (pool) => {
    const envMappings = parseEnvPathMap();
    if (!pool) return envMappings;

    let rows = [];
    try {
        const result = await pool.request().query(`
            SELECT folder_id, local_subpath, remote_url_prefix, note
            FROM ${MAPPINGS_TABLE}
            WHERE is_active = 1
            ORDER BY local_subpath;
        `);
        rows = result.recordset || [];
    } catch (error) {
        // Bảng chưa được tạo là trạng thái bình thường với DB cũ → không làm ồn log
        if (!/invalid object name/i.test(String(error.message))) {
            console.warn(`⚠️  Không đọc được ${MAPPINGS_TABLE}: ${error.message}`);
        }
        return envMappings;
    }

    const merged = rows
        .map((row) => ({
            folderId: row.folder_id == null ? null : Number(row.folder_id),
            localSubpath: String(row.local_subpath || '').trim(),
            remoteUrlPrefix: String(row.remote_url_prefix || '').trim(),
            note: String(row.note || '').trim(),
        }))
        .filter((mapping) => mapping.localSubpath && mapping.remoteUrlPrefix);

    for (const envMapping of envMappings) {
        const index = merged.findIndex(
            (mapping) => normalizeSubpath(mapping.localSubpath) === normalizeSubpath(envMapping.localSubpath)
        );
        if (index >= 0) merged[index] = { ...merged[index], ...envMapping, folderId: merged[index].folderId };
        else merged.push(envMapping);
    }

    return merged;
};

/**
 * Tìm ánh xạ khớp với 1 đường dẫn tương đối (tính từ gốc thư mục dự án).
 * Khớp theo TIỀN TỐ ĐOẠN ĐƯỜNG DẪN và ưu tiên ánh xạ SÂU NHẤT (khớp cụ thể hơn).
 * @returns {{ localSubpath: string, remoteUrlPrefix: string, remainingPath: string, note: string }|null}
 */
const findPathMapping = (mappings = [], relativePath = '') => {
    const normalizedRelative = normalizeSubpath(relativePath);
    if (!normalizedRelative || !mappings.length) return null;

    const targetSegments = normalizedRelative.split('/');
    const originalSegments = toSlashes(String(relativePath))
        .replace(/^\/+|\/+$/g, '')
        .split('/');

    let best = null;
    let bestDepth = -1;

    for (const mapping of mappings) {
        const key = normalizeSubpath(mapping.localSubpath);
        if (!key) continue;

        const keySegments = key.split('/');
        if (keySegments.length > targetSegments.length) continue;
        if (!keySegments.every((segment, index) => segment === targetSegments[index])) continue;
        if (keySegments.length <= bestDepth) continue;

        best = mapping;
        bestDepth = keySegments.length;
    }

    if (!best) return null;

    return {
        localSubpath: best.localSubpath,
        remoteUrlPrefix: best.remoteUrlPrefix,
        // Giữ nguyên chính tả/dấu của đường dẫn gốc, chỉ cắt bỏ phần đã ánh xạ
        remainingPath: originalSegments.slice(bestDepth).join('/'),
        note: best.note || '',
    };
};

/**
 * Ghép URL SharePoint/OneDrive để mở TRỰC TIẾP file PowerPoint trên trình duyệt.
 * Prefix lấy từ SyncFolders.sharepoint_url_prefix (hoặc remote_url_prefix trong bảng ánh xạ
 * SyncFolderMappings nếu file nằm trong thư mục được chia sẻ), phần đường dẫn con được encode từng đoạn.
 * VD: https://vnuaeduvn-my.sharepoint.com/personal/671279_sv_vnua_edu_vn/Documents/PSM27_Library
 *     + "Tệp của Phạm Trung Hiếu - EE/EE_Loi_Dien_X.pptx"
 *     → .../PSM27_Library/T%E1%BB%87p%20c%E1%BB%A7a.../EE_Loi_Dien_X.pptx?web=1
 * @param {{ webViewer?: boolean }} options — webViewer = true (mặc định) sẽ thêm ?web=1
 *   để OneDrive mở bằng PowerPoint Online, không dừng ở trang thông tin file.
 */
const buildSharePointUrl = (prefix = '', relativePath = '', { webViewer = true } = {}) => {
    const cleanPrefix = encodeUrlPath(normalizePrefix(prefix));
    const encodedPath = encodePathSegments(relativePath);
    if (!cleanPrefix) return encodedPath;

    const url = encodedPath ? `${cleanPrefix}/${encodedPath}` : cleanPrefix;
    if (!webViewer) return url;
    return `${url}${url.includes('?') ? '&' : '?'}web=1`;
};

/**
 * Kiểm tra 1 prefix có phải URL TRỰC TIẾP tới thư mục tài liệu không.
 * Link trang chủ kiểu .../_layouts/15/sharepoint.aspx/onedrive KHÔNG phải link trực tiếp
 * (ghép thêm đường dẫn con vào sẽ không mở được file).
 */
const isDirectSharePointPrefix = (prefix = '') => {
    const value = toSlashes(String(prefix)).toLowerCase();
    if (!value.startsWith('http')) return false;
    return value.includes('/documents') || value.includes('/sites/');
};

/**
 * Xác định prefix URL TRỰC TIẾP của 1 dòng dbo.SyncFolders.
 * Thứ tự ưu tiên:
 *   1. sharepoint_url_prefix trong DB nếu đã là link trực tiếp;
 *   2. ghép SHAREPOINT_TENANT_BASE (.env) + đường dẫn thư mục dự án tính từ gốc OneDrive local;
 *   3. không dựng được → giữ prefix gốc kèm cảnh báo để Admin cấu hình lại.
 * @returns {{ prefix: string, source: 'configured'|'derived'|'invalid', note: string|null }}
 */
const resolveDirectPrefix = (folder = {}) => {
    const configured = normalizePrefix(folder.sharepoint_url_prefix || '');
    if (isDirectSharePointPrefix(configured)) {
        return { prefix: configured, source: 'configured', note: null };
    }

    const folderPath = String(folder.folder_path || '').trim();
    if (folderPath && SHAREPOINT_TENANT_BASE) {
        const syncRoot = ONEDRIVE_SYNC_ROOT || path.dirname(folderPath);
        const relativeFromRoot = encodePathSegments(path.relative(syncRoot, folderPath));
        const derived = relativeFromRoot ? `${SHAREPOINT_TENANT_BASE}/${relativeFromRoot}` : SHAREPOINT_TENANT_BASE;

        return {
            prefix: derived,
            source: 'derived',
            note:
                `sharepoint_url_prefix trong dbo.SyncFolders chưa phải link trực tiếp (đang là "${configured || 'trống'}"). ` +
                `Đã tự dựng link trực tiếp từ SHAREPOINT_TENANT_BASE: ${derived}. ` +
                'Nên cập nhật cột này trong DB (xem sql/add_powerpoint_app_url.sql) rồi quét lại.',
        };
    }

    return {
        prefix: configured,
        source: 'invalid',
        note:
            'Không dựng được link trực tiếp tới file PowerPoint: sharepoint_url_prefix chưa đúng và chưa cấu hình ' +
            'SHAREPOINT_TENANT_BASE. Hãy mở thư mục dự án trên OneDrive web → Copy link rồi cập nhật ' +
            'dbo.SyncFolders.sharepoint_url_prefix (dạng: https://<tenant>-my.sharepoint.com/personal/<user>/Documents/<thu_muc_du_an>).',
    };
};

/**
 * Dựng 2 đường dẫn mở TRỰC TIẾP 1 file PowerPoint theo chuẩn Office Web Apps:
 *   - sharepointWebUrl : mở trên trình duyệt (PowerPoint Online, thêm ?web=1)
 *   - powerpointAppUrl : mở bằng ứng dụng PowerPoint Desktop (protocol handler ms-powerpoint:ofe|u|)
 *     — link này KHÔNG kèm ?web=1 (cờ ?web=1 chỉ dành cho trình duyệt).
 * @param {string} localFilePath — đường dẫn tuyệt đối của file .ppt/.pptx trên máy
 * @param {{ folderPath?: string, folderPrefix?: string, mappings?: Array }} options
 *   folderPath   : thư mục gốc dự án (để tính đường dẫn tương đối của file)
 *   folderPrefix : prefix URL trực tiếp của thư mục (kết quả resolveDirectPrefix); trống → tự resolve
 *   mappings     : danh sách ánh xạ local → remote (xem loadPathMappings) cho các thư mục con
 *                  được chia sẻ (shortcut) nằm trên OneDrive của người khác
 * @returns {{ sharepointWebUrl: string, powerpointAppUrl: string, mapped: boolean, localSubpath: string }}
 */
const buildDirectPowerPointUrls = (localFilePath, { folderPath = '', folderPrefix = '', mappings = [] } = {}) => {
    const filePath = String(localFilePath || '');
    const root = normalizePrefix(folderPath);
    const relativePath = root && filePath ? path.relative(root, filePath) : path.basename(filePath);

    // File nằm ngoài thư mục gốc (junction / ổ đĩa khác) → chỉ dùng tên file để URL không bị lệch cấp
    const safeRelativePath = relativePath.startsWith('..') ? path.basename(filePath) : relativePath;

    // Thư mục con là thư mục chia sẻ (shortcut) → bắt buộc dùng URL remote trong bảng ánh xạ,
    // vì tên trên web khác tên trên máy (VD: local "Tệp của ... - ME" ↔ remote "PSM27 Library/ME").
    const mapping = findPathMapping(mappings, safeRelativePath);
    const prefix = mapping ? normalizePrefix(mapping.remoteUrlPrefix) : folderPrefix || root;
    const urlRelativePath = mapping ? mapping.remainingPath : safeRelativePath;

    const sharepointWebUrl = buildSharePointUrl(prefix, urlRelativePath);
    const sharepointFileUrl = buildSharePointUrl(prefix, urlRelativePath, { webViewer: false });
    const powerpointAppUrl = sharepointFileUrl ? `ms-powerpoint:ofe|u|${sharepointFileUrl}` : '';

    return {
        sharepointWebUrl,
        powerpointAppUrl,
        mapped: Boolean(mapping),
        localSubpath: mapping ? mapping.localSubpath : '',
    };
};

/** Cắt ngắn chuỗi theo độ dài cột SQL để không bị lỗi "String or binary data would be truncated". */
const clip = (value, maxLength) => {
    const text = value == null ? '' : String(value);
    return text.length > maxLength ? text.slice(0, maxLength) : text;
};

/**
 * Quét đệ quy một thư mục để tìm toàn bộ file .ppt / .pptx.
 * Bỏ qua file tạm của Office (~$...) và desktop.ini.
 * @returns {{ files: Array, errors: string[] }}
 */
const walkSlideFiles = (rootPath, currentPath = rootPath, depth = 0, result = { files: [], errors: [] }) => {
    if (depth > MAX_SCAN_DEPTH) {
        result.errors.push(`Vượt quá độ sâu cho phép (${MAX_SCAN_DEPTH}) tại: ${currentPath}`);
        return result;
    }

    let entries = [];
    try {
        entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (error) {
        result.errors.push(`Không đọc được thư mục ${currentPath}: ${error.message}`);
        return result;
    }

    for (const entry of entries) {
        const entryName = entry.name;
        if (entryName.startsWith('~$') || entryName.toLowerCase() === 'desktop.ini') continue;
        // Bỏ qua junction/liên kết tượng trưng để tránh quét lặp vô tận
        if (entry.isSymbolicLink()) continue;

        const absolutePath = path.join(currentPath, entryName);

        if (entry.isDirectory()) {
            walkSlideFiles(rootPath, absolutePath, depth + 1, result);
            continue;
        }

        if (!SLIDE_EXTENSIONS.includes(path.extname(entryName).toLowerCase())) continue;

        try {
            const stats = fs.statSync(absolutePath);
            result.files.push({
                fileName: entryName,
                relativePath: path.relative(rootPath, absolutePath),
                fullPath: absolutePath,
                sizeBytes: stats.size,
                lastModified: stats.mtime,
            });
        } catch (error) {
            result.errors.push(`Không đọc được thông tin file ${absolutePath}: ${error.message}`);
        }
    }

    return result;
};

/** Gắn các tham số dùng chung cho câu INSERT/UPDATE của PresentationReports. */
const bindReportParams = (request, folder, file) => {
    // Link trực tiếp: folder.direct_prefix được tính sẵn 1 lần cho mỗi thư mục (xem scanPresentations)
    const { sharepointWebUrl, powerpointAppUrl } = buildDirectPowerPointUrls(file.fullPath, {
        folderPath: folder.folder_path,
        folderPrefix: folder.direct_prefix || resolveDirectPrefix(folder).prefix,
        mappings: folder.path_mappings || [],
    });

    return request
        .input('folder_id', sql.Int, folder.folder_id)
        .input('file_name', sql.NVarChar(255), clip(file.fileName, 255))
        .input('relative_path', sql.NVarChar(500), clip(file.relativePath, 500))
        .input('full_local_path', sql.NVarChar(500), clip(file.fullPath, 500))
        .input('sharepoint_web_url', sql.NVarChar(1000), clip(sharepointWebUrl, 1000))
        .input('powerpoint_app_url', sql.NVarChar(2000), clip(powerpointAppUrl, 2000))
        .input('category_code', sql.NVarChar(50), classifyCategory(file.relativePath))
        .input('file_size_mb', sql.Float, Number((file.sizeBytes / (1024 * 1024)).toFixed(2)))
        .input('last_modified', sql.DateTime, file.lastModified);
};

/**
 * UPSERT 1 file PowerPoint vào dbo.PresentationReports theo khóa nghiệp vụ full_local_path.
 * @returns {'inserted'|'updated'}
 */
const upsertReport = async (pool, folder, file) => {
    const updated = await bindReportParams(pool.request(), folder, file).query(`
        UPDATE dbo.PresentationReports
        SET folder_id = @folder_id,
            file_name = @file_name,
            relative_path = @relative_path,
            sharepoint_web_url = @sharepoint_web_url,
            powerpoint_app_url = @powerpoint_app_url,
            category_code = @category_code,
            file_size_mb = @file_size_mb,
            last_modified = @last_modified
        WHERE full_local_path = @full_local_path;
    `);

    if (updated.rowsAffected[0] > 0) return 'updated';

    await bindReportParams(pool.request(), folder, file).query(`
        INSERT INTO dbo.PresentationReports
            (folder_id, file_name, relative_path, full_local_path,
             sharepoint_web_url, powerpoint_app_url, category_code, file_size_mb, last_modified)
        VALUES
            (@folder_id, @file_name, @relative_path, @full_local_path,
             @sharepoint_web_url, @powerpoint_app_url, @category_code, @file_size_mb, @last_modified);
    `);

    return 'inserted';
};

/**
 * Xoá các bản ghi cache của 1 folder mà file tương ứng đã không còn trên đĩa
 * (file bị xoá / đổi tên / OneDrive chưa sync về máy).
 * An toàn: KHÔNG dọn khi lần quét này không tìm thấy file nào hoặc có lỗi đọc thư mục,
 * tránh xoá sạch dữ liệu khi ổ đĩa hoặc OneDrive tạm thời không truy cập được.
 */
const pruneMissingReports = async (pool, folderId, existingPaths, hasReadErrors) => {
    if (hasReadErrors || existingPaths.length === 0) return 0;
    if (existingPaths.length > 1000) {
        console.warn('⚠️  Bỏ qua bước dọn bản ghi mồ côi vì số file quá lớn:', existingPaths.length);
        return 0;
    }

    const request = pool.request().input('folder_id', sql.Int, folderId);
    const placeholders = existingPaths.map((value, index) => {
        const name = `path_${index}`;
        request.input(name, sql.NVarChar(500), clip(value, 500));
        return `@${name}`;
    });

    const result = await request.query(`
        DELETE FROM dbo.PresentationReports
        WHERE folder_id = @folder_id
          AND full_local_path NOT IN (${placeholders.join(', ')});
    `);

    return result.rowsAffected[0] || 0;
};

/**
 * Bảo đảm bảng SyncFolders có cấu hình để quét: nếu chưa có dòng active nào thì tạo
 * dòng mặc định cho dự án PSM27_Library (đường dẫn OneDrive local + prefix SharePoint).
 * Ghi đè được bằng biến môi trường ONEDRIVE_PROJECT_NAME / ONEDRIVE_LIBRARY_ROOT / SHAREPOINT_URL_PREFIX.
 * @returns {boolean} true nếu vừa tạo mới cấu hình
 */
const ensureSyncFoldersSeed = async (pool) => {
    const existing = await pool
        .request()
        .query('SELECT COUNT(*) AS total FROM dbo.SyncFolders WHERE is_active = 1');

    if (existing.recordset[0].total > 0) return false;

    await pool
        .request()
        .input('project_name', sql.NVarChar(255), DEFAULT_SYNC_FOLDER.projectName)
        .input('folder_path', sql.NVarChar(500), DEFAULT_SYNC_FOLDER.folderPath)
        .input(
            'sharepoint_url_prefix',
            sql.NVarChar(500),
            resolveDirectPrefix({
                folder_path: DEFAULT_SYNC_FOLDER.folderPath,
                sharepoint_url_prefix: DEFAULT_SYNC_FOLDER.sharepointPrefix,
            }).prefix
        )
        .query(`
            INSERT INTO dbo.SyncFolders (project_name, folder_path, sharepoint_url_prefix, is_active)
            VALUES (@project_name, @folder_path, @sharepoint_url_prefix, 1);
        `);

    console.log(`➕ Đã tạo cấu hình SyncFolders mặc định: ${DEFAULT_SYNC_FOLDER.projectName} → ${DEFAULT_SYNC_FOLDER.folderPath}`);
    return true;
};

/**
 * Kiểm tra prefix SharePoint có dạng "mở trực tiếp file" hay không.
 * Link kiểu .../_layouts/15/sharepoint.aspx/onedrive chỉ là trang chủ OneDrive,
 * ghép thêm đường dẫn con sẽ KHÔNG mở được file → cảnh báo để Admin cập nhật lại.
 */
const warnIfPrefixIsNotDirect = (prefix) => {
    const value = String(prefix || '').toLowerCase();
    if (!value || value.includes('sharepoint.aspx') || !value.includes('/documents')) {
        console.warn(
            '⚠️  sharepoint_url_prefix chưa phải URL thư mục trực tiếp. Hãy mở thư mục PSM27_Library trên ' +
            'OneDrive web → Copy link, rồi cập nhật dbo.SyncFolders.sharepoint_url_prefix (hoặc SHAREPOINT_URL_PREFIX trong .env). ' +
            'Dạng đúng: https://<tenant>-my.sharepoint.com/personal/<user>/Documents/PSM27_Library'
        );
    }
};

/**
 * Quét các thư mục đang active trong dbo.SyncFolders và đồng bộ cache vào dbo.PresentationReports.
 * @param {{ folderId?: number|null }} options — chỉ định 1 folder_id nếu chỉ muốn quét lại 1 thư mục
 * @returns {Promise<object>} bảng tổng kết: số folder, số file, số bản ghi thêm mới/cập nhật/đã dọn, cảnh báo...
 */
async function scanPresentations({ folderId = null } = {}) {
    const startedAt = Date.now();
    const pool = await poolPromise;
    const seededDefaultFolder = await ensureSyncFoldersSeed(pool);

    // Ánh xạ local → remote của các thư mục con là thư mục chia sẻ (shortcut) trên OneDrive khác
    const pathMappings = await loadPathMappings(pool);

    const folders = (
        await pool
            .request()
            .input('folder_id', sql.Int, folderId)
            .query(`
                SELECT folder_id, project_name, folder_path, sharepoint_url_prefix
                FROM dbo.SyncFolders
                WHERE is_active = 1 AND (@folder_id IS NULL OR folder_id = @folder_id)
                ORDER BY project_name;
            `)
    ).recordset;

    const summary = {
        seededDefaultFolder,
        sharepointTenantBase: SHAREPOINT_TENANT_BASE,
        pathMappings: pathMappings.length,
        scannedFolders: 0,
        totalFiles: 0,
        inserted: 0,
        updated: 0,
        removed: 0,
        categoryCounts: { LOI_DIEN: 0, LOI_QUANG: 0, LOI_CO: 0, KHAC: 0 },
        folders: [],
        warnings: [],
    };

    for (const folder of folders) {
        // Ánh xạ dùng cho folder này: dòng không gắn folder_id (áp dụng mọi thư mục) hoặc khớp folder_id
        const folderMappings = pathMappings.filter(
            (mapping) => mapping.folderId == null || Number(mapping.folderId) === Number(folder.folder_id)
        );

        const folderResult = {
            folder_id: folder.folder_id,
            project_name: folder.project_name,
            folder_path: folder.folder_path,
            files: 0,
            inserted: 0,
            updated: 0,
            removed: 0,
            mappedFiles: 0,
            pathMappings: folderMappings.map((mapping) => ({
                local_subpath: mapping.localSubpath,
                remote_url_prefix: mapping.remoteUrlPrefix,
            })),
            notes: [],
        };

        if (!fs.existsSync(folder.folder_path)) {
            const message = `Không tìm thấy thư mục: ${folder.folder_path}`;
            folderResult.error = message;
            summary.warnings.push(message);
            summary.folders.push(folderResult);
            continue;
        }

        // Xác định prefix URL TRỰC TIẾP: ưu tiên cấu hình trong DB, nếu chưa đúng thì suy ra từ
        // SHAREPOINT_TENANT_BASE + đường dẫn thư mục dự án (để link click ra vẫn mở đúng file).
        const prefixInfo = resolveDirectPrefix(folder);
        folderResult.prefix_source = prefixInfo.source;

        if (prefixInfo.note) {
            folderResult.notes.push(prefixInfo.note);
            if (prefixInfo.source === 'invalid') {
                // Không dựng được link trực tiếp → đẩy cảnh báo lên UI để Admin cấu hình lại
                warnIfPrefixIsNotDirect(folder.sharepoint_url_prefix);
                summary.warnings.push(prefixInfo.note);
            } else {
                console.warn(`ℹ️  ${folder.project_name}: ${prefixInfo.note}`);
            }
        }

        // Kiểm tra nhanh ánh xạ: URL remote phải là link THƯ MỤC TRỰC TIẾP mới ghép được đường dẫn file con
        for (const mapping of folderMappings) {
            if (isDirectSharePointPrefix(mapping.remoteUrlPrefix)) continue;
            const message =
                `Ánh xạ "${mapping.localSubpath}" chưa trỏ tới URL thư mục trực tiếp (${mapping.remoteUrlPrefix}) ` +
                '→ link file trong thư mục này sẽ không mở được.';
            folderResult.notes.push(message);
            summary.warnings.push(message);
        }

        // Gắn prefix + ánh xạ đã resolve vào folder để bindReportParams dùng lại (khỏi tính lặp cho từng file)
        const scanFolder = { ...folder, direct_prefix: prefixInfo.prefix, path_mappings: folderMappings };

        const { files, errors } = walkSlideFiles(folder.folder_path);
        files.forEach((file) => {
            summary.categoryCounts[classifyCategory(file.relativePath)] += 1;
        });

        for (const file of files) {
            if (findPathMapping(folderMappings, file.relativePath)) folderResult.mappedFiles += 1;

            const action = await upsertReport(pool, scanFolder, file);
            if (action === 'inserted') {
                folderResult.inserted += 1;
                summary.inserted += 1;
            } else {
                folderResult.updated += 1;
                summary.updated += 1;
            }
        }

        const removed = await pruneMissingReports(
            pool,
            folder.folder_id,
            files.map((file) => file.fullPath),
            errors.length > 0
        );

        folderResult.files = files.length;
        folderResult.removed = removed;
        folderResult.errors = errors;
        summary.removed += removed;
        summary.totalFiles += files.length;
        summary.scannedFolders += 1;
        if (errors.length) summary.warnings.push(...errors);
        summary.folders.push(folderResult);
    }

    summary.durationMs = Date.now() - startedAt;
    console.log(
        `📊 Quét PowerPoint xong: ${summary.scannedFolders} folder, ${summary.totalFiles} file ` +
        `(+${summary.inserted} mới, ~${summary.updated} cập nhật, -${summary.removed} đã dọn) trong ${summary.durationMs}ms`
    );

    return summary;
}

module.exports = {
    scanPresentations,
    ensureSyncFoldersSeed,
    classifyCategory,
    buildSharePointUrl,
    buildDirectPowerPointUrls,
    resolveDirectPrefix,
    isDirectSharePointPrefix,
    loadPathMappings,
    findPathMapping,
    normalizeSubpath,
    walkSlideFiles,
    normalizeText,
    SHAREPOINT_TENANT_BASE,
    MAPPINGS_TABLE,
    CATEGORY_CODES,
    DEFAULT_SYNC_FOLDER,
};



