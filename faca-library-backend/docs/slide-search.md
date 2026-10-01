# Slide Search — tìm kiếm nội dung PowerPoint (.pptx)

Tài liệu vận hành cho tính năng **Slide Search** (dropdown "Slide Search" trên header → `/search`).

## 1. Kiến trúc

```
dbo.SyncFolders (is_active = 1)
        │  folder_path + sharepoint_url_prefix
        ▼
services/cronScanner.js   ── 15 phút/lần (SLIDE_CRON) hoặc POST /api/slides/reindex
        │  • walkSlideFiles() lấy mọi .pptx
        │  • đọc file (có xử lý OneDrive cloud-only: ghim +P rồi chờ tải về)
        │  • dựng link SharePoint: sharepoint_url_prefix + SyncFolderMappings
        ▼
dbo.SlideIndexes (FileId, FileName, SharePointEmbedUrl, SlideIndex, SlideText)
        ▲
        │  GET /api/slides/search?keyword=...
controllers/slideController.js
        │  Tầng 1 (slide): LIKE nội dung SlideText (COLLATE Latin1_General_CI_AI → không phân biệt dấu)
        │  Tầng 2 (file) : LIKE tên file / đường dẫn trong dbo.PresentationReports
        │                  (REPLACE('_',' ') nên "lens blur" khớp Lens_Blur_Report.pptx)
        ▼
SlideSearchPage.jsx → iframe <url>?action=embedview&wdSlideIndex=N
```

Tầng 2 giúp **file chưa tải về máy vẫn tìm được theo tên** và vẫn mở được trên PowerPoint Online.
Kết quả được **khu trùng theo tên file**: cùng một file có thể nằm ở nhiều gốc quét (OneDrive gốc + bản mirror local).

## 2. Xử lý file OneDrive cloud-only (Files On-Demand)

`cronScanner.readFileWithHydration()`:
1. Đọc trực tiếp file (nhanh nhất, khi file đã có trên máy).
2. Gặp lỗi kiểu `UNKNOWN` / `EIO` (Windows: `ERROR_CLOUD_FILE_*`) → `attrib +P` (ghim "Always keep on this device")
   rồi chờ tối đa `SLIDE_HYDRATE_WAIT_MS` (mặc định 8000ms) để OneDrive tải về.
3. Quá `HYDRATE_MAX_STRIKES` (2) lần hết thời gian chờ → coi OneDrive không tải được,
   bỏ qua các file cloud-only còn lại trong lượt quét đó (**không** mất `8s × số file`),
   đếm vào `summary.offline` và thử lại ở lượt quét sau (tự phục hồi khi OneDrive tải được).

Biến môi trường: `SLIDE_CRON`, `SLIDE_HYDRATE` (`false` để tắt ghim/chờ), `SLIDE_HYDRATE_WAIT_MS`.

## 3. Sự cố thực tế ngày 29/09/2026 — 24/26 file không index được

Triệu chứng: `POST /api/slides/reindex` → `{ total: 26, indexed: 0, skipped: 26, offline: 24, slides: 0 }`.

Nguyên nhân gốc (đã kiểm chứng trên máy):

| Kiểm tra | Kết quả |
| --- | --- |
| `[IO.File]::OpenRead(<file cloud-only>)` | `The cloud file provider is not running` (~20ms) |
| Thuộc tính file | `Offline, ReparsePoint, Sparse, RecallOnDataAccess` (24 file) |
| `Get-Service cldflt` | `Running` (driver Cloud Files bình thường) |
| OneDrive đang chạy | `OneDrive.exe /client=Personal /background` + `OneDrive.exe /background` |
| Account vnua.edu.vn | `HKCU\...\OneDrive\Accounts\Business1`: `LastSignInResult=0`, `LastSignInTime` = lúc khởi động → **đã đăng nhập** |
| Thiếu gì | **`OneDrive.Sync.Service`** (MSIX `Microsoft.OneDriveSync`, v26.168.0830.0006) **không chạy** → không có provider nào nhận sync root `OneDrive!...!Business1` |

→ Đây là lỗi phía **client OneDrive trên máy**, không phải lỗi code: OneDrive báo đăng nhập thành công nhưng
không gắn được Cloud Files provider cho account `vnua.edu.vn`, nên mọi file cloud-only trả lỗi ngay lập tức
(không phải chờ tải chậm).

### Chẩn đoán sâu hơn (cùng ngày 29/09/2026 — buổi tối)

Để provider hoạt động cần **CẢ 2** tiến trình sau cùng chạy:

| Tiến trình | Vai trò | Cách chạy tay |
| --- | --- | --- |
| `OneDrive.exe /client=Business` | instance xử lý sync root `OneDrive - vnua.edu.vn` (khai báo trong `Accounts\Business1`) — **không tự khởi động lại** khi bị kill | `%LOCALAPPDATA%\Microsoft\OneDrive\OneDrive.exe /client=Business /background` |
| `OneDrive.Sync.Service.exe /silentConfig` | host Cloud Files provider (MSIX `Microsoft.OneDriveSync`) — spawn bởi OneDrive hoặc chạy tay | `%LOCALAPPDATA%\Microsoft\OneDrive\<bản>\OneDrive.Sync.Service.exe /silentConfig` |

**Đã thử** (vẫn FAIL — đọc file cloud-only trả lỗi ngay, 24/26 file):
1. Chỉ chạy `OneDrive.Sync.Service` (kể cả để OneDrive tự spawn với `/restartedByOneDrive`).
2. Chạy thêm instance `/client=Business` (đúng thứ tự Business → service).
3. Kill toàn bộ OneDrive rồi khởi động lại từ đầu (launcher tự spawn Personal nhưng **không** spawn Business).
4. Service chạy trước, rồi mới Business (đúng thứ tự lý thuyết), chờ thêm 15–45s.

→ Cả 4 tiến trình cùng chạy mà provider vẫn **không gắn được** vào sync root.
Gợi ý nguyên nhân còn lại (chưa kiểm chứng thêm, cần thao tác tay):
- Client OneDrive Business **được cài/cập nhật ngay trong ngày** 14:57–16:08
  (xem `logs\Business\Install-*.loggz`, `Update-*.loggz` — bản 26.168.0830.0006), và
- Máy đang có **40 mục `PendingFileRenameOperations`** chờ reboot.

### Cách 1 — sửa OneDrive (khuyến nghị, tự phục hồi toàn bộ)
1. **Khởi động lại máy** (áp pending file rename của bản update hôm nay) — cách rẻ nhất, thử trước.
2. Vẫn lỗi → OneDrive (khay hệ thống) → **Settings → Account → Unlink this PC** cho tài khoản
   `671279@sv.vnua.edu.vn`, sau đó đăng nhập lại và chọn sync thư mục `PSM27_Library`.
3. Nếu vẫn lỗi: cài lại OneDrive (`%LOCALAPPDATA%\Microsoft\OneDrive\Update\OneDriveSetup.exe`), hoặc
   `Add/Remove Programs → Microsoft OneDrive → Modify/Repair`; có thể cần IT/quyền admin.
4. Kiểm tra đã tải được file:
   ```powershell
   (Get-Item 'C:\Users\laptop\OneDrive - vnua.edu.vn\PSM27_Library\...\file.pptx').Attributes  # không còn Offline
   ```
5. `POST /api/slides/reindex` → `offline` giảm về 0, `slides` > 0. Cron tự index, **không cần sửa code**.

### Cách 2 — thư mục local "mirror" (làm được ngay, không phụ thuộc OneDrive)
1. Tải 26 file `.pptx` từ OneDrive/SharePoint web về `D:\FACA_Library\PSM27_Library`,
   giữ **nguyên tên thư mục con** `Tệp của Phạm Trung Hiếu - EE / - ME / - OE`
   (để bảng `dbo.SyncFolderMappings` khớp sẵn, link SharePoint dựng ra vẫn đúng).
2. Chạy `sql/add_local_mirror_folder.sql` → thêm 1 dòng `SyncFolders` trỏ vào thư mục mirror
   (và sửa `sharepoint_url_prefix` sai của dòng OneDrive cũ). *Script idempotent — chạy lại an toàn.*
3. Đồng bộ **cả 2 tầng** (tên file + nội dung slide):
   ```powershell
   curl.exe -s -X POST http://localhost:5000/api/reports/sync     # tầng TÊN -> dbo.PresentationReports
   curl.exe -s -X POST http://localhost:5000/api/slides/reindex   # tầng NỘI DUNG -> dbo.SlideIndexes
   ```
4. Link iframe vẫn là SharePoint (`sharepoint_url_prefix` + `SyncFolderMappings`) nên file
   chưa tải về máy vẫn mở/xem được trong trình duyệt.

Hai gốc quét có thể cùng tồn tại: kết quả search **khu trùng theo tên file** (đã chuẩn hoá NFC,
không phân biệt hoa/thường) nên không hiện 2 lần; thống kê dùng `COUNT(DISTINCT file_name)`
(26 file, không đếm trùng OneDrive + mirror).

**Đã kiểm chứng end-to-end (29/09/2026)**: đặt 1 file `.pptx` test vào đúng mirror
`D:\FACA_Library\PSM27_Library\Tệp ... - EE\` → `POST /api/reports/sync` tạo đúng
`sharepoint_web_url` (`.../PSM27%20Library/EE/<file>?web=1`), `POST /api/slides/reindex`
index 2 slide với `SharePointEmbedUrl` `...?action=embedview`, search tìm được cả 2 tầng;
sau đó đã dọn sạch dữ liệu test (về trạng thái 26 file / 2 indexed / 6 slide).

## 4. Kiểm tra nhanh

```powershell
# Trạng thái index
curl.exe -s -X POST http://localhost:5000/api/slides/reindex
# Tìm kiếm (không phân biệt dấu, tên file dùng '_' vẫn khớp khi gõ cách)
curl.exe -s "http://localhost:5000/api/slides/search?keyword=Short%20Circuit"
curl.exe -s "http://localhost:5000/api/slides/search?keyword=lens%20blur"
curl.exe -s "http://localhost:5000/api/slides/search?keyword=l%E1%BB%97i%20%C4%91i%E1%BB%87n%20OVP"
```

Bảng liên quan: `dbo.SyncFolders`, `dbo.SyncFolderMappings`, `dbo.PresentationReports`, `dbo.SlideIndexes`
(`sql/create_slide_indexes.sql`, `sql/seed_sync_folders.sql`, `sql/add_sync_folder_mappings.sql`).
