import { Users, UserCheck, UserX, CalendarDays } from 'lucide-react';

/**
 * AdminKpiCards — 4 thẻ chỉ số tổng quan người dùng.
 */
export default function AdminKpiCards({ totalUsers, activeUsers, newThisMonth, blockedInactiveUsers }) {
    const cards = [
        { label: 'Tổng người dùng', value: totalUsers, valueCls: 'text-slate-900', boxCls: 'bg-indigo-50 text-indigo-600', Icon: Users },
        { label: 'Đang hoạt động', value: activeUsers, valueCls: 'text-emerald-600', boxCls: 'bg-emerald-50 text-emerald-600', Icon: UserCheck },
        { label: 'Mới trong tháng', value: newThisMonth, valueCls: 'text-sky-600', boxCls: 'bg-sky-50 text-sky-600', Icon: CalendarDays },
        { label: 'Đã khóa / Tạm dừng', value: blockedInactiveUsers, valueCls: 'text-rose-600', boxCls: 'bg-rose-50 text-rose-600', Icon: UserX },
    ];

    return (
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, valueCls, boxCls, Icon }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-slate-500">{label}</p>
                            <p className={`mt-1 text-3xl font-extrabold ${valueCls}`}>{value}</p>
                        </div>
                        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${boxCls}`}>
                            <Icon className="h-6 w-6" />
                        </span>
                    </div>
                </div>
            ))}
        </section>
    );
}
