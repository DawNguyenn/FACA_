import { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Lock, Trash2 } from 'lucide-react';

import {
    createUser,
    updateUser,
    deleteUser as deleteUserApi,
} from '../../services/userService';

import useAdminUsers from '../../hooks/useAdminUsers';
import useAdminUserTable from '../../hooks/useAdminUserTable';
import { STATUS_COLORS, nextStatus, userIdOf, userNameOf } from '../../components/admin/adminConfig';
import AdminKpiCards from '../../components/admin/AdminKpiCards';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminUsersTable from '../../components/admin/AdminUsersTable';
import AdminPagination from '../../components/admin/AdminPagination';
import AdminNotice from '../../components/admin/AdminNotice';
import AdminErrorBanner from '../../components/admin/AdminErrorBanner';
import ConfirmModal from '../../components/admin/ConfirmModal';
import UserFormModal from '../../components/admin/UserFormModal';

// ================================================================
//  MAIN COMPONENT — lắp ghép các module admin: dữ liệu (hooks),
//  bảng / lọc / phân trang, banner lỗi, toast và 3 modal.
// ================================================================
export default function AdminDashboard() {
    // --- Dữ liệu user từ Backend API ---
    const { users, loading, loadError, submitting, setSubmitting, refreshUsers } = useAdminUsers();


    // --- Toast notice state: { type: 'success' | 'error', text: string } ---
    const [notice, setNotice] = useState(null);
    useEffect(() => {
        if (!notice) return undefined;
        const t = window.setTimeout(() => setNotice(null), 3000);
        return () => window.clearTimeout(t);
    }, [notice]);

    // --- Logic lọc / sắp xếp / phân trang của bảng ---
    const {
        search, changeSearch,
        roleFilter, changeRoleFilter,
        statusFilter, changeStatusFilter,
        sortKey, sortDir, handleSort, resetFilters,
        stats, filtered, totalPages, activePage, setCurrentPage, pagedUsers,
    } = useAdminUserTable(users);
    const { totalUsers, activeUsers, blockedInactiveUsers, newThisMonth } = stats;


    // --- Modal / confirm state ---
    const [userModal, setUserModal] = useState(null); // { mode: 'add'|'edit', user?: object }
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null);

    const showNotice = (type, text) => setNotice({ type, text });

    const handleSubmitUser = async (data) => {
        const isEdit = userModal?.mode === 'edit';
        setSubmitting(true);
        try {
            // Map form fields to API expected fields (snake_case)
            const apiPayload = {
                full_name: data.name,
                email: data.email,
                role_name: data.role,
                department: data.department,
                status: data.status,
                avatar_url: data.avatarUrl,
            };
            if (isEdit) {
                await updateUser(data.id, apiPayload);
                showNotice('success', 'Cập nhật người dùng thành công.');
            } else {
                await createUser(apiPayload);
                showNotice('success', 'Thêm người dùng mới thành công.');
            }
            setUserModal(null);
            await refreshUsers();
        } catch (err) {
            showNotice('error', err.message || 'Có lỗi xảy ra khi lưu người dùng.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            const userId = userIdOf(deleteTarget);
            await deleteUserApi(userId);
            showNotice('success', 'Đã xóa người dùng.');
            setDeleteTarget(null);
            await refreshUsers();
        } catch (err) {
            showNotice('error', err.message || 'Không thể xóa người dùng.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async () => {
        setSubmitting(true);
        try {
            const userId = userIdOf(statusTarget);
            await updateUser(userId, { status: nextStatus(statusTarget.status) });
            showNotice('success', 'Cập nhật trạng thái thành công.');
            setStatusTarget(null);
            await refreshUsers();
        } catch (err) {
            showNotice('error', err.message || 'Không thể đổi trạng thái người dùng.');
        } finally {
            setSubmitting(false);
        }
    };

    const nextStatusOf = (status) => nextStatus(status);
    const nextStatusLabel = (status) => STATUS_COLORS[nextStatus(status)].label;

    // Render ---------------------------------------------------------
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                {/* ================= HEADER ================= */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                            <ShieldCheck className="h-4 w-4" /> Administration
                        </p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                            Quản Lý Người Dùng
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Quick overview of accounts with powerful search, filters and management actions.
                        </p>
                    </div>
                    <button
                        onClick={() => setUserModal({ mode: 'add' })}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        <UserPlus className="h-4 w-4" /> Add New User
                    </button>
                </header>

                {/* ================= KPI METRIC CARDS ================= */}
                <AdminKpiCards
                    totalUsers={totalUsers}
                    activeUsers={activeUsers}
                    newThisMonth={newThisMonth}
                    blockedInactiveUsers={blockedInactiveUsers}
                />

                {/* ================= FILTER & SEARCH BAR ================= */}
                <AdminFilterBar
                    search={search}
                    onSearchChange={changeSearch}
                    roleFilter={roleFilter}
                    onRoleChange={changeRoleFilter}
                    statusFilter={statusFilter}
                    onStatusChange={changeStatusFilter}
                    onReset={resetFilters}
                />

                {/* ================= ERROR BANNER ================= */}
                {loadError && (
                    <AdminErrorBanner message={loadError} onRetry={refreshUsers} />
                )}

                {/* ================= DATA TABLE ================= */}
                <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <AdminUsersTable
                        loading={loading}
                        pagedUsers={pagedUsers}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        onEdit={(user) => setUserModal({ mode: 'edit', user })}
                        onStatusChange={setStatusTarget}
                        onDelete={setDeleteTarget}
                        onResetFilters={resetFilters}
                    />
                    <AdminPagination
                        filteredCount={filtered.length}
                        activePage={activePage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </section>
            </div>

            {/* ================= TOAST NOTICE ================= */}
            <AdminNotice notice={notice} />

            {/* ================= ADD / EDIT MODAL ================= */}
            {userModal && (
                <UserFormModal
                    mode={userModal.mode}
                    initial={userModal.mode === 'edit' ? userModal.user : null}
                    onCancel={() => setUserModal(null)}
                    onSubmit={handleSubmitUser}
                />
            )}

            {/* ================= DELETE CONFIRMATION ================= */}
            {deleteTarget && (
                <ConfirmModal
                    title="Delete user"
                    tone="danger"
                    icon={<Trash2 className="h-6 w-6" />}
                    message={`Are you sure you want to permanently delete “${userNameOf(deleteTarget)}”? This action cannot be undone.`}
                    confirmLabel="Delete"
                    busy={submitting}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                />
            )}

            {/* ================= STATUS CHANGE CONFIRMATION ================= */}
            {statusTarget && (
                <ConfirmModal
                    title={nextStatusOf(statusTarget.status) === 'blocked' ? 'Block user' : 'Unblock user'}
                    tone={nextStatusOf(statusTarget.status) === 'blocked' ? 'warning' : 'success'}
                    icon={<Lock className="h-6 w-6" />}
                    message={`Change status of “${userNameOf(statusTarget)}” from “${STATUS_COLORS[statusTarget.status].label}” to “${nextStatusLabel(statusTarget.status)}”?`}
                    confirmLabel={nextStatusLabel(statusTarget.status)}
                    busy={submitting}
                    onCancel={() => setStatusTarget(null)}
                    onConfirm={handleStatusChange}
                />
            )}
        </div>
    );
}

