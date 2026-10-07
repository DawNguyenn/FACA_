/**
 * Skeleton — khối placeholder hiệu ứng Tailwind `animate-pulse` dùng chung
 * thay cho spinner ở các màn đang tải dữ liệu (đỡ "giật" và gợi ý layout).
 *
 * Props:
 *  - variant: 'text' | 'card' | 'table-row'  (mặc định 'text')
 *  - width, height: kích thước tuỳ chỉnh cho variant 'text'
 *  - circle: bo tròn hoàn toàn (variant 'text', vd avatar)
 *  - className: class Tailwind bổ sung
 *  - rows, cols: số hàng / số cột cho variant 'table-row'
 *
 * Lưu ý: variant 'table-row' render ra các <tr> -> PHẢI đặt bên trong <tbody>.
 */
export default function Skeleton({
    variant = 'text',
    width,
    height,
    className = '',
    rows = 5,
    cols = 6,
    circle = false,
}) {
    if (variant === 'table-row') {
        return (
            <>
                {Array.from({ length: rows }).map((_, r) => (
                    <tr key={`skeleton-row-${r}`} className="animate-pulse">
                        {Array.from({ length: cols }).map((_, c) => (
                            <td key={`skeleton-cell-${r}-${c}`} className="px-4 py-3">
                                <div
                                    className="h-4 rounded bg-slate-200"
                                    style={{ width: c === 0 ? 40 : `${[70, 90, 60, 80, 55][c % 5]}%` }}
                                />
                            </td>
                        ))}
                    </tr>
                ))}
            </>
        );
    }

    if (variant === 'card') {
        return (
            <div
                className={[
                    'animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
                    className,
                ].join(' ')}
            >
                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                <div className="mt-4 h-4 w-3/4 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-200" />
                <div className="mt-4 h-3 w-1/3 rounded bg-slate-200" />
            </div>
        );
    }

    // variant 'text' (mặc định)
    return (
        <div
            className={[
                'animate-pulse bg-slate-200',
                circle ? 'rounded-full' : 'rounded',
                className,
            ].join(' ')}
            style={{ width: width ?? '100%', height: height ?? 16 }}
        />
    );
}
