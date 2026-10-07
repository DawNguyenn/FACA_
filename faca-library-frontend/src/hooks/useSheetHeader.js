import { useCallback, useEffect, useState } from 'react';
import { fetchSheetMeta } from '../services/warehouseService';

const errMsg = (err) =>
    err.response?.data?.message || err.message || 'Không tải được thông tin header của sheet.';

/**
 * useSheetHeader — nạp khối metadata HEADER của sheet đang chọn
 * (GET /warehouse/sources/:source/meta) cho component SheetHeaderCard.
 *
 * Tự nạp lại mỗi khi `source` đổi -> khối header luôn khớp với bảng dữ liệu bên dưới.
 *
 * Lưu ý thiết kế: `header/loading/error` được SUY RA lúc render từ `state.sourceKey`
 * (thay vì setState trong thân effect) -> không phát sinh render dư thừa khi đổi sheet.
 *
 * @param {string} source — key sheet (vd 'sbn27')
 * @returns {{header: Object|null, loading: boolean, error: string|null, reload: Function}}
 */
export default function useSheetHeader(source) {
    // state luôn gắn với sourceKey đã nạp, để biết dữ liệu có thuộc sheet hiện tại không
    const [state, setState] = useState({ sourceKey: '', header: null, loading: false, error: null });

    const isCurrent = Boolean(source) && state.sourceKey === source;

    // ---- Giá trị trả về (suy ra) ----
    const header = isCurrent ? state.header : null;
    const error = isCurrent ? state.error : null;
    const loading = source ? (!isCurrent || state.loading) : false;

    /** Nạp lại metadata (dùng sau khi vừa sửa xong). */
    const reload = useCallback(async (key) => {
        const target = key === undefined ? source : key;
        if (!target) return null;
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await fetchSheetMeta(target);
            const next = res?.sheetHeader || null;
            setState({ sourceKey: target, header: next, loading: false, error: null });
            return next;
        } catch (err) {
            setState({ sourceKey: target, header: null, loading: false, error: errMsg(err) });
            return null;
        }
    }, [source]);

    // Đổi sheet -> nạp metadata mới (setState chỉ nằm trong callback bất đồng bộ)
    useEffect(() => {
        if (!source) return undefined;
        let alive = true;
        fetchSheetMeta(source)
            .then((res) => {
                if (!alive) return;
                setState({ sourceKey: source, header: res?.sheetHeader || null, loading: false, error: null });
            })
            .catch((err) => {
                if (!alive) return;
                setState({ sourceKey: source, header: null, loading: false, error: errMsg(err) });
            });
        return () => { alive = false; };
    }, [source]);

    return { header, loading, error, reload };
}