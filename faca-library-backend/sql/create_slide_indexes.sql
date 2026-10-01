/* ============================================================
   create_slide_indexes.sql — Chỉ mục nội dung từng slide (.pptx)
   phục vụ tính năng "Tìm kiếm PowerPoint theo từ khóa & nhảy
   trực tiếp tới đúng slide" (GET /api/slides/search?keyword=...).

   Bảng: dbo.SlideIndexes
     IndexId            INT IDENTITY(1,1) PRIMARY KEY
     FileId             NVARCHAR(255) NOT NULL  -- full_local_path (khóa nghiệp vụ)
     FileName           NVARCHAR(255) NOT NULL
     SharePointEmbedUrl NVARCHAR(MAX) NOT NULL  -- link nhúng gốc (?web=1), CHƯA gồm wdSlideIndex
     SlideIndex         INT NOT NULL            -- bắt đầu từ 1 (Slide 1 = wdSlideIndex=1)
     SlideText          NVARCHAR(MAX) NOT NULL
     LastScannedAt      DATETIME DEFAULT GETDATE()

   Script idempotent — chạy lại nhiều lần không lỗi/không nhân bản.
   Chạy:
     sqlcmd -S DAWNGUYENN -U sa -P <password> -d FACA_DB -i sql\create_slide_indexes.sql
   ============================================================ */
USE FACA_DB;
GO

IF OBJECT_ID('dbo.SlideIndexes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SlideIndexes (
        IndexId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SlideIndexes PRIMARY KEY,
        FileId NVARCHAR(255) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        SharePointEmbedUrl NVARCHAR(MAX) NOT NULL,
        SlideIndex INT NOT NULL,
        SlideText NVARCHAR(MAX) NOT NULL,
        LastScannedAt DATETIME NOT NULL CONSTRAINT DF_SlideIndexes_LastScannedAt DEFAULT (GETDATE())
    );
    PRINT N'➕ Đã tạo bảng dbo.SlideIndexes.';
END
ELSE
    PRINT N'ℹ️  Bảng dbo.SlideIndexes đã tồn tại, bỏ qua CREATE TABLE.';
GO

-- Đảm bảo đủ cột khi bảng đã tồn tại từ bản cũ (thiếu cột nào thêm cột đó)
IF COL_LENGTH('dbo.SlideIndexes', 'FileId') IS NULL
    ALTER TABLE dbo.SlideIndexes ADD FileId NVARCHAR(255) NOT NULL CONSTRAINT DF_SlideIndexes_FileId DEFAULT (N'');
GO
IF COL_LENGTH('dbo.SlideIndexes', 'FileName') IS NULL
    ALTER TABLE dbo.SlideIndexes ADD FileName NVARCHAR(255) NOT NULL CONSTRAINT DF_SlideIndexes_FileName DEFAULT (N'');
GO
IF COL_LENGTH('dbo.SlideIndexes', 'SharePointEmbedUrl') IS NULL
    ALTER TABLE dbo.SlideIndexes ADD SharePointEmbedUrl NVARCHAR(MAX) NOT NULL CONSTRAINT DF_SlideIndexes_Embed DEFAULT (N'');
GO
IF COL_LENGTH('dbo.SlideIndexes', 'SlideIndex') IS NULL
    ALTER TABLE dbo.SlideIndexes ADD SlideIndex INT NOT NULL CONSTRAINT DF_SlideIndexes_SlideIndex DEFAULT (1);
GO
IF COL_LENGTH('dbo.SlideIndexes', 'SlideText') IS NULL
    ALTER TABLE dbo.SlideIndexes ADD SlideText NVARCHAR(MAX) NOT NULL CONSTRAINT DF_SlideIndexes_SlideText DEFAULT (N'');
GO
IF COL_LENGTH('dbo.SlideIndexes', 'LastScannedAt') IS NULL
    ALTER TABLE dbo.SlideIndexes ADD LastScannedAt DATETIME NOT NULL CONSTRAINT DF_SlideIndexes_LastScannedAt2 DEFAULT (GETDATE());
GO

-- 1 file + 1 slide = 1 dòng duy nhất → UPSERT/DELETE theo cặp khóa này
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_SlideIndexes_File_Slide' AND object_id = OBJECT_ID('dbo.SlideIndexes'))
BEGIN
    CREATE UNIQUE INDEX UX_SlideIndexes_File_Slide ON dbo.SlideIndexes (FileId, SlideIndex);
    PRINT N'➕ Đã tạo UNIQUE INDEX UX_SlideIndexes_File_Slide.';
END
GO

-- Tìm kiếm LIKE '%keyword%' trên nội dung slide
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SlideIndexes_SlideText' AND object_id = OBJECT_ID('dbo.SlideIndexes'))
BEGIN
    CREATE INDEX IX_SlideIndexes_SlideText ON dbo.SlideIndexes (FileId) INCLUDE (SlideIndex, LastScannedAt);
    PRINT N'➕ Đã tạo INDEX IX_SlideIndexes_SlideText.';
END
GO

SELECT COUNT(*) AS total_rows, COUNT(DISTINCT FileId) AS total_files FROM dbo.SlideIndexes;
GO
