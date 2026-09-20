import { useState } from 'react';
import { X, Mail, Plus } from 'lucide-react';
import ModalShell from './ModalShell';
import {
    ROLE_OPTIONS, STATUS_OPTIONS, STATUS_COLORS, DEPARTMENT_OPTIONS,
    userIdOf, userNameOf, userRoleOf, userAvatarOf, userCreatedAtOf,
} from './adminConfig';

/**
 * UserFormModal — form thêm / sửa user (validate tên + email).
 */
export default function UserFormModal({ mode, initial, onCancel, onSubmit }) {
    const [form, setForm] = useState({
        id: userIdOf(initial) ?? null,
        name: initial ? (userNameOf(initial) === 'Unknown' ? '' : userNameOf(initial)) : '',
        email: initial?.email ?? '',
        role: initial ? userRoleOf(initial) : 'User',
        department: initial?.department ?? 'IT',
        status: initial?.status ?? 'active',
        avatarUrl: initial ? (userAvatarOf(initial) ?? '') : '',
        createdAt: (initial ? userCreatedAtOf(initial) : null) || new Date().toISOString().slice(0, 10),
    });

    const [errors, setErrors] = useState({});
    const [showErrors, setShowErrors] = useState(false);

    const setField = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        if (showErrors) validate({ ...form, [key]: value });
    };

    const validate = (f) => {
        const e = {};
        if (!f.name.trim()) e.name = 'Name is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'A valid email is required.';
        return e;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate(form);
        setErrors(errs);
        setShowErrors(true);
        if (Object.keys(errs).length === 0) onSubmit({ ...form });
    };

    const labelCls = 'block text-sm font-medium text-slate-600';
    const inputCls =
        'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

    return (
        <ModalShell>
            <div className="flex items-start gap-4">
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-900">
                        {mode === 'edit' ? 'Edit User' : 'Add New User'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {mode === 'edit'
                            ? `Update the details for ${userNameOf(initial)}.`
                            : 'Create a brand new account and grant it a role.'}
                    </p>
                </div>
                <button onClick={onCancel} aria-label="Close"
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="user-name">Full name</label>
                    <input id="user-name" type="text" value={form.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder="e.g. Anna Nowak"
                        className={`${inputCls} ${errors.name ? 'border-red-400' : ''}`} />
                    {errors.name && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>}
                </div>

                <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="user-email">Email</label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input id="user-email" type="email" value={form.email}
                            onChange={(e) => setField('email', e.target.value)}
                            placeholder="name@faca.io"
                            className={`${inputCls} ${errors.email ? 'border-red-400' : ''} pl-9`} />
                    </div>
                    {errors.email && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.email}</p>}
                </div>

                <div>
                    <label className={labelCls} htmlFor="user-role">Role</label>
                    <select id="user-role" value={form.role} onChange={(e) => setField('role', e.target.value)} className={inputCls}>
                        {ROLE_OPTIONS.filter((r) => r !== 'All').map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div>
                    <label className={labelCls} htmlFor="user-department">Department / Division</label>
                    <select id="user-department" value={form.department} onChange={(e) => setField('department', e.target.value)} className={inputCls}>
                        {DEPARTMENT_OPTIONS
                            .map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div>
                    <label className={labelCls} htmlFor="user-status">Status</label>
                    <select id="user-status" value={form.status} onChange={(e) => setField('status', e.target.value)} className={inputCls}>
                        {STATUS_OPTIONS.filter((s) => s !== 'All').map((s) => (
                            <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={labelCls} htmlFor="user-created">Joined date</label>
                    <input id="user-created" type="date" value={form.createdAt}
                        onChange={(e) => setField('createdAt', e.target.value)} className={inputCls} />
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                    <button type="button" onClick={onCancel}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
                        Cancel
                    </button>
                    <button type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
                        <Plus className="h-4 w-4" />
                        {mode === 'edit' ? 'Save Changes' : 'Create User'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

