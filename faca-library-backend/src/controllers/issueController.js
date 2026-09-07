const { poolPromise, sql } = require('../config/db');

// 1. LẤY DANH SÁCH & TÌM KIẾM ISSUES (Dành cho cả Staff và Admin)
const getIssues = async (req, res) => {
    try {
        const { search, category_id, config_name } = req.query;
        const pool = await poolPromise;
        
        let query = `
            SELECT 
                i.issue_id,
                i.title,
                i.config_name,
                i.process_step,
                i.symptom,
                i.root_cause,
                i.solution,
                i.status,
                i.created_at,
                c.category_name,
                u.full_name AS created_by_name,
                u.department
            FROM dbo.issues i
            INNER JOIN dbo.issue_categories c ON i.category_id = c.category_id
            INNER JOIN dbo.users u ON i.created_by = u.user_id
            WHERE 1=1
        `;

        const request = pool.request();

        // Lọc theo từ khóa tìm kiếm (Title, Symptom, Root Cause, Solution)
        if (search) {
            query += ` AND (i.title LIKE @search OR i.symptom LIKE @search OR i.root_cause LIKE @search OR i.solution LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        // Lọc theo Loại lỗi (Điện / Quang / Cơ)
        if (category_id) {
            query += ` AND i.category_id = @category_id`;
            request.input('category_id', sql.Int, category_id);
        }

        // Lọc theo Mã Config Camera
        if (config_name) {
            query += ` AND i.config_name LIKE @config_name`;
            request.input('config_name', sql.VarChar, `%${config_name}%`);
        }

        query += ` ORDER BY i.created_at DESC`;

        const result = await request.query(query);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách Issues:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tải danh sách sự cố.',
            error: error.message
        });
    }
};

// 2. LẤY CHI TIẾT 1 ISSUE THEO ID
const getIssueById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    i.*,
                    c.category_name,
                    u1.full_name AS created_by_name,
                    u2.full_name AS updated_by_name
                FROM dbo.issues i
                INNER JOIN dbo.issue_categories c ON i.category_id = c.category_id
                INNER JOIN dbo.users u1 ON i.created_by = u1.user_id
                LEFT JOIN dbo.users u2 ON i.updated_by = u2.user_id
                WHERE i.issue_id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin sự cố này.'
            });
        }

        res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Lỗi khi lấy chi tiết Issue:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tải chi tiết sự cố.',
            error: error.message
        });
    }
};

// 3. THÊM MỚI ISSUE (Chỉ dành cho Admin / Authorized Users)
const createIssue = async (req, res) => {
    try {
        const { title, category_id, config_name, process_step, symptom, root_cause, solution, created_by } = req.body;

        // Validate cơ bản các trường bắt buộc
        if (!title || !category_id || !config_name || !symptom || !root_cause || !solution || !created_by) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ các thông tin bắt buộc.'
            });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input('title', sql.NVarChar(255), title)
            .input('category_id', sql.Int, category_id)
            .input('config_name', sql.VarChar(100), config_name)
            .input('process_step', sql.NVarChar(100), process_step || null)
            .input('symptom', sql.NVarChar(sql.MAX), symptom)
            .input('root_cause', sql.NVarChar(sql.MAX), root_cause)
            .input('solution', sql.NVarChar(sql.MAX), solution)
            .input('created_by', sql.Int, created_by)
            .query(`
                INSERT INTO dbo.issues (title, category_id, config_name, process_step, symptom, root_cause, solution, created_by)
                OUTPUT INSERTED.issue_id
                VALUES (@title, @category_id, @config_name, @process_step, @symptom, @root_cause, @solution, @created_by);
            `);

        const newIssueId = result.recordset[0].issue_id;

        res.status(201).json({
            success: true,
            message: 'Thêm mới thông tin sự cố thành công!',
            issue_id: newIssueId
        });

    } catch (error) {
        console.error('Lỗi khi thêm mới Issue:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi thêm sự cố.',
            error: error.message
        });
    }
};

// 4. CẬP NHẬT ISSUE
const updateIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category_id, config_name, process_step, symptom, root_cause, solution, status, updated_by } = req.body;

        const pool = await poolPromise;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar(255), title)
            .input('category_id', sql.Int, category_id)
            .input('config_name', sql.VarChar(100), config_name)
            .input('process_step', sql.NVarChar(100), process_step)
            .input('symptom', sql.NVarChar(sql.MAX), symptom)
            .input('root_cause', sql.NVarChar(sql.MAX), root_cause)
            .input('solution', sql.NVarChar(sql.MAX), solution)
            .input('status', sql.VarChar(20), status || 'OPEN')
            .input('updated_by', sql.Int, updated_by)
            .query(`
                UPDATE dbo.issues
                SET 
                    title = @title,
                    category_id = @category_id,
                    config_name = @config_name,
                    process_step = @process_step,
                    symptom = @symptom,
                    root_cause = @root_cause,
                    solution = @solution,
                    status = @status,
                    updated_by = @updated_by,
                    updated_at = GETDATE()
                WHERE issue_id = @id;
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sự cố để cập nhật.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật sự cố thành công!'
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật Issue:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật sự cố.',
            error: error.message
        });
    }
};

// 5. XÓA ISSUE
const deleteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM dbo.issues WHERE issue_id = @id;`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sự cố để xóa.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Xóa sự cố thành công!'
        });

    } catch (error) {
        console.error('Lỗi khi xóa Issue:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi xóa sự cố.',
            error: error.message
        });
    }
};

module.exports = {
    getIssues,
    getIssueById,
    createIssue,
    updateIssue,
    deleteIssue
};