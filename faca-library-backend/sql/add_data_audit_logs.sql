-- ================================================================
-- add_data_audit_logs.sql
-- Nhật ký thao tác dữ liệu (Audit Log) cho kho & các bảng nghiệp vụ:
--   Ai đã sửa / sửa khi nào / làm gì (INSERT-UPDATE-DELETE-BULK_UPDATE) /
--   dữ liệu trước & sau (changes_json) / địa chỉ IP.
--
-- Idempotent: chạy lại nhiều lần vẫn an toàn.
-- LƯU Ý: Backend tự tạo bảng này khi khởi động
--        (services/auditLogService.ensureAuditLogsSchema) -> file này TUỲ CHỌN,
--        chủ yếu để DBA quản lý/khôi phục thủ công.
-- ================================================================
USE FACA_DB;
GO

-- 1. Bảng nhật ký
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'data_audit_logs')
BEGIN
    CREATE TABLE dbo.data_audit_logs (
        audit_id         BIGINT IDENTITY(1,1) PRIMARY KEY,
        table_name       VARCHAR(100)  NOT NULL,   -- VD: Staging_SBN27, Staging_SheetMeta
        record_id        VARCHAR(100)  NOT NULL,   -- ID/PK bản ghi bị tác động
        action_type      VARCHAR(20)   NOT NULL,   -- INSERT | UPDATE | DELETE | BULK_UPDATE
        changed_by       INT           NULL,       -- user_id thực hiện
        changed_by_name  NVARCHAR(100) NULL,       -- full_name (fallback email) để tra nhanh
        changed_at       DATETIME      NOT NULL CONSTRAINT DF_data_audit_logs_changed_at DEFAULT (GETDATE()),
        changes_json     NVARCHAR(MAX) NULL,       -- VD: [{"field":"Qty","old":"10","new":"15"}]
        ip_address       VARCHAR(45)   NULL
    );
END
GO

-- 2. Index tra cứu lịch sử theo bảng + bản ghi
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_audit_logs_table_record'
                 AND object_id = OBJECT_ID('dbo.data_audit_logs'))
BEGIN
    CREATE INDEX IX_audit_logs_table_record
        ON dbo.data_audit_logs(table_name, record_id);
END
GO

-- 3. Index tra cứu theo thời gian (mới nhất trước)
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_audit_logs_changed_at'
                 AND object_id = OBJECT_ID('dbo.data_audit_logs'))
BEGIN
    CREATE INDEX IX_audit_logs_changed_at
        ON dbo.data_audit_logs(changed_at DESC);
END
GO

-- 4. Ràng buộc action_type hợp lệ (BULK_SAVE = bulk sync hỗn hợp có diff chi tiết)
IF EXISTS (SELECT 1 FROM sys.check_constraints
           WHERE name = 'CK_data_audit_logs_action_type'
             AND parent_object_id = OBJECT_ID('dbo.data_audit_logs'))
BEGIN
    ALTER TABLE dbo.data_audit_logs
        DROP CONSTRAINT CK_data_audit_logs_action_type;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
               WHERE name = 'CK_data_audit_logs_action_type'
                 AND parent_object_id = OBJECT_ID('dbo.data_audit_logs'))
BEGIN
    ALTER TABLE dbo.data_audit_logs
        ADD CONSTRAINT CK_data_audit_logs_action_type
        CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_SAVE'));
END
GO

-- 5. Xem nhanh
SELECT TOP 50 audit_id, table_name, record_id, action_type,
       changed_by_name, changed_at, ip_address
FROM dbo.data_audit_logs
ORDER BY changed_at DESC, audit_id DESC;
GO