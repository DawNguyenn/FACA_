const requireAdmin = (req, res, next) => {
    return requireRoles([1])(req, res, next);
};

// Cho phép nhiều role_id
const requireRoles = (allowedRoleIds = [1]) => {
    return (req, res, next) => {
        const roleId = req.user && req.user.roleId;
        if (!roleId) {
            return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
        }
        if (!allowedRoleIds.includes(roleId)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
        }
        next();
    };
};

module.exports = { requireAdmin, requireRoles };
