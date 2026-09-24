-- ================================================================
-- drop_powerpoint_slides.sql
-- DỌN DẸP TUỲ CHỌN: xoá bảng dbo.PowerPointSlides cùng các index/constraint
-- của tính năng "Bài giảng PowerPoint" (đã được gỡ khỏi source code).
--
-- ⚠️ CHỈ chạy khi chắc chắn không cần dữ liệu metadata slide nữa.
-- Chạy: sqlcmd -S <SERVER> -d FACA_DB -U sa -P <password> -C -i sql\drop_powerpoint_slides.sql
-- (Không dùng GO để có thể chạy như 1 batch từ mssql/Node.js)
-- Script idempotent: chạy lại nhiều lần không gây lỗi.
-- ================================================================

IF OBJECT_ID('dbo.PowerPointSlides', 'U') IS NOT NULL
BEGIN
    -- Index/constraint được xoá tự động cùng bảng (PK, UNIQUE, INDEX)
    DROP TABLE dbo.PowerPointSlides;
    PRINT 'Đã xoá bảng dbo.PowerPointSlides.';
END
ELSE
BEGIN
    PRINT 'Bảng dbo.PowerPointSlides không tồn tại — không cần làm gì.';
END;
