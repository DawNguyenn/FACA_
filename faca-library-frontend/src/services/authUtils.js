/**
 * Auth utilities — helpers for reading the current user's role from localStorage
 * and checking role-based permissions.
 *
 * The user object stored in localStorage may use different field names depending
 * on the backend API version (SQL Server PascalCase / snake_case / no-case /
 * plain role string):
 *   - RoleId  (PascalCase, e.g. 1)
 *   - role_id (snake_case, e.g. 1)
 *   - roleid  (no case,     e.g. 1)
 *   - role    (string,      e.g. 'admin')
 *
 * Role ID mapping (matches backend dbo.roles):
 *   1 = Admin, 2 = Engineer, 3 = QC, 4 = Warehouse, 5 = User
 */

export const ROLE_ID = {
    ADMIN: 1,
    ENGINEER: 2,
    QC: 3,
    WAREHOUSE: 4,
    USER: 5,
};

export const ROLE_NAME = {
    1: 'Admin',
    2: 'Engineer',
    3: 'QC',
    4: 'Warehouse',
    5: 'User',
};

// Reverse map: role name (lowercase) → role_id
const ROLE_NAME_MAP = {
    admin: ROLE_ID.ADMIN,
    engineer: ROLE_ID.ENGINEER,
    qc: ROLE_ID.QC,
    warehouse: ROLE_ID.WAREHOUSE,
    user: ROLE_ID.USER,
};

/**
 * Read and parse the current user object from localStorage.
 * @returns {object|null}
 */
export const getCurrentUser = () => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

/**
 * Extract the numeric role_id from the user object,
 * supporting all field-name variants used across the codebase.
 * @param {object|null} user
 * @returns {number|null}
 */
export const getUserRoleId = (user = null) => {
    if (!user) return null;
    // Numeric role id under various casing conventions
    const id = user.RoleId || user.RoleID || user.role_id || user.roleid;
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
        const n = parseInt(id, 10);
        if (!Number.isNaN(n)) return n;
    }
    // String role name (e.g. 'admin')
    if (typeof user.role === 'string') {
        return ROLE_NAME_MAP[user.role.toLowerCase()] ?? null;
    }
    return null;
};

/**
 * Check whether the current logged-in user is an Admin (role_id === 1).
 * @returns {boolean}
 */
export const isAdmin = () => getUserRoleId(getCurrentUser()) === ROLE_ID.ADMIN;

/**
 * Check whether the current user belongs to one of the allowed roles.
 * @param {number[]} roles — array of allowed role IDs
 * @returns {boolean}
 */
export const hasRole = (roles = []) => roles.includes(getUserRoleId(getCurrentUser()));

/**
 * Check whether the current user can edit warehouse data.
 * Admin (1) and Warehouse (4) roles are allowed; all others are read-only.
 * @returns {boolean}
 */
export const canEditWarehouse = () => hasRole([ROLE_ID.ADMIN, ROLE_ID.WAREHOUSE]);
