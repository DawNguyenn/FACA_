-- ================================================================
--  Migration: Thêm cột RowIndex và SheetName vào Staging_InventoryImport
--  RowIndex: Số thứ tự dòng thực tế trong file Excel
--  SheetName: Tên sheet chứa dữ liệu (phục vụ debug và hiển thị UI)
--  StagingID: Identity column để xác định thứ tự insert (ROW_NUMBER)
-- ===============================================================
IF COL_LENGTH('dbo.Staging_InventoryImport', 'RowIndex') IS NULL
    ALTER TABLE dbo.Staging_InventoryImport
        ADD RowIndex INT NULL;
GO

IF COL_LENGTH('dbo.Staging_InventoryImport', 'SheetName') IS NULL
    ALTER TABLE dbo.Staging_InventoryImport
        ADD SheetName NVARCHAR(255) NULL;
GO

-- Thêm StagingID identity column nếu chưa có (cần cho ROW_NUMBER approach)
IF COL_LENGTH('dbo.Staging_InventoryImport', 'StagingID') IS NULL
BEGIN
    ALTER TABLE dbo.Staging_InventoryImport
        ADD StagingID INT IDENTITY(1,1) NOT NULL;
    ALTER TABLE dbo.Staging_InventoryImport
        ADD CONSTRAINT PK_Staging_InventoryImport PRIMARY KEY (StagingID);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ProcessInventoryImport
    @ImportID INT,
    @UserID   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @StagingCount INT;
    DECLARE @Inserted     INT;
    DECLARE @Skipped      INT;
    DECLARE @DefaultMaterialTypeId INT;
    DECLARE @DefaultVendorId INT;

    IF NOT EXISTS (SELECT 1 FROM dbo.Staging_InventoryImport WHERE ImportID = @ImportID)
    BEGIN
        RAISERROR ('No staged rows found for ImportID = %d.', 16, 1, @ImportID);
        RETURN -1;
    END

    SELECT @StagingCount = COUNT(*)
    FROM dbo.Staging_InventoryImport WHERE ImportID = @ImportID;

    BEGIN TRANSACTION
    BEGIN TRY

        -- ============================================================
        -- 0. CHUẨN BỊ MATERIAL TYPE & VENDOR MẶC ĐỊNH (Tránh lỗi NOT NULL)
        -- ============================================================
        IF OBJECT_ID('dbo.MaterialTypes', 'U') IS NOT NULL
        BEGIN
            SELECT TOP 1 @DefaultMaterialTypeId = MaterialTypeId FROM dbo.MaterialTypes;
            IF @DefaultMaterialTypeId IS NULL
            BEGIN
                INSERT INTO dbo.MaterialTypes (MaterialTypeName) VALUES (N'General / Khác');
                SET @DefaultMaterialTypeId = SCOPE_IDENTITY();
            END
        END

        IF OBJECT_ID('dbo.Vendors', 'U') IS NOT NULL
        BEGIN
            SELECT TOP 1 @DefaultVendorId = VendorID FROM dbo.Vendors;
            IF @DefaultVendorId IS NULL
            BEGIN
                INSERT INTO dbo.Vendors (VendorName, Country, IsActive) VALUES (N'Unknown / Khác', N'N/A', 1);
                SET @DefaultVendorId = SCOPE_IDENTITY();
            END
        END

        -- ============================================================
        -- 1. AUTO-PROVISIONING: Tạo mới các danh mục nếu chưa tồn tại
        -- ============================================================

        -- A. Auto-provision Projects
        INSERT INTO dbo.Projects (ProjectCode, ProjectName)
        SELECT DISTINCT
            LTRIM(RTRIM(s.ProjectName)),
            LTRIM(RTRIM(s.ProjectName))
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND NULLIF(LTRIM(RTRIM(s.ProjectName)), '') IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM dbo.Projects p
              WHERE p.ProjectCode = LTRIM(RTRIM(s.ProjectName))
                 OR p.ProjectName = LTRIM(RTRIM(s.ProjectName))
          );

        -- B. Auto-provision Vendors
        IF OBJECT_ID('dbo.Vendors', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dbo.Vendors (VendorName)
            SELECT DISTINCT
                LTRIM(RTRIM(s.VendorName))
            FROM dbo.Staging_InventoryImport s
            WHERE s.ImportID = @ImportID
              AND NULLIF(LTRIM(RTRIM(s.VendorName)), '') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.Vendors v
                  WHERE v.VendorName = LTRIM(RTRIM(s.VendorName))
              );
        END

        -- C. Auto-provision Builds
        INSERT INTO dbo.Builds (BuildCode, ProjectId)
        SELECT DISTINCT
            LTRIM(RTRIM(s.BuildCode)),
            p.ProjectId
        FROM dbo.Staging_InventoryImport s
        INNER JOIN dbo.Projects p ON p.ProjectCode = LTRIM(RTRIM(s.ProjectName))
                                  OR p.ProjectName = LTRIM(RTRIM(s.ProjectName))
        WHERE s.ImportID = @ImportID
          AND NULLIF(LTRIM(RTRIM(s.BuildCode)), '') IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM dbo.Builds b
              WHERE b.BuildCode = LTRIM(RTRIM(s.BuildCode))
                AND b.ProjectId = p.ProjectId
          );

        -- D. Auto-provision Materials (Liên kết VendorID & MaterialTypeID)
        INSERT INTO dbo.Materials (MaterialName, Description, Config, MaterialTypeID, VendorID)
        SELECT DISTINCT
            LTRIM(RTRIM(s.MaterialName)),
            NULLIF(LTRIM(RTRIM(s.Description)), ''),
            NULLIF(LTRIM(RTRIM(s.Config)), ''),
            @DefaultMaterialTypeId,
            COALESCE(v.VendorID, @DefaultVendorId)
        FROM dbo.Staging_InventoryImport s
        LEFT JOIN dbo.Vendors v ON v.VendorName = LTRIM(RTRIM(s.VendorName))
        WHERE s.ImportID = @ImportID
          AND NULLIF(LTRIM(RTRIM(s.MaterialName)), '') IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM dbo.Materials m
              WHERE m.MaterialName = LTRIM(RTRIM(s.MaterialName))
          );


        -- ============================================================
        -- 2. VALIDATION & ERROR LOGGING
        -- ============================================================

        UPDATE dbo.Staging_InventoryImport
        SET IsValid = 0, ErrorMessage = NULL
        WHERE ImportID = @ImportID;

        -- Check 1: Lỗi rỗng LotID
        UPDATE s
        SET s.ErrorMessage = N'Thiếu mã Lot (Lot ID)'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND NULLIF(LTRIM(RTRIM(s.LotCode)), '') IS NULL;

        -- Check 2: Lỗi trùng LotID đã có trong bảng InventoryLots
        UPDATE s
        SET s.ErrorMessage = N'Mã Lot ID đã tồn tại trong kho'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND EXISTS (SELECT 1 FROM dbo.InventoryLots il WHERE il.LotCode = LTRIM(RTRIM(s.LotCode)));

        -- Check 3: Lỗi trùng LotID giữa các dòng trong cùng 1 file Excel
        UPDATE s
        SET s.ErrorMessage = N'Mã Lot ID bị trùng lặp trong file Excel'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND s.LotCode IN (
              SELECT LotCode 
              FROM dbo.Staging_InventoryImport 
              WHERE ImportID = @ImportID AND NULLIF(LTRIM(RTRIM(LotCode)), '') IS NOT NULL
              GROUP BY LotCode 
              HAVING COUNT(*) > 1
          );

        -- Check 4: Sai định dạng Ngày nhận (Receive Date)
        UPDATE s
        SET s.ErrorMessage = N'Ngày nhận (Receive Date) không hợp lệ'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND (NULLIF(LTRIM(RTRIM(s.ReceiveDate)), '') IS NULL OR TRY_CONVERT(DATETIME, s.ReceiveDate) IS NULL);

        -- Check 5: Sai định dạng Số lượng xuất (Shipment Qty)
        UPDATE s
        SET s.ErrorMessage = N'Số lượng Shipment Qty phải là số nguyên không âm'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND (NULLIF(LTRIM(RTRIM(s.ShipmentQty)), '') IS NULL OR TRY_CAST(s.ShipmentQty AS INT) IS NULL OR TRY_CAST(s.ShipmentQty AS INT) < 0);

        -- Check 6: Lỗi liên kết khóa ngoại (nếu không map được Project/Build/Material)
        UPDATE s
        SET s.ErrorMessage = N'Không thể liên kết Project, Build hoặc Vật liệu'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND NOT (
              EXISTS (SELECT 1 FROM dbo.Projects p WHERE p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName)))
              AND EXISTS (SELECT 1 FROM dbo.Materials m WHERE m.MaterialName = LTRIM(RTRIM(s.MaterialName)))
          );

        -- Đánh dấu dòng hợp lệ
        UPDATE dbo.Staging_InventoryImport
        SET IsValid = 1
        WHERE ImportID = @ImportID AND ErrorMessage IS NULL;


        -- ============================================================
        -- 3. INSERT INTO INVENTORYLOTS
        -- ============================================================
        INSERT INTO dbo.InventoryLots
            (ProjectID, BuildID, MaterialID, LotCode,
             ReceiveDate, ShipmentQty, IQAScrapQty, StockQty,
             DRI, BillNo, InvoiceNo, Remark)
        SELECT
            p.ProjectId,
            b.BuildId,
            m.MaterialID,
            LTRIM(RTRIM(s.LotCode)),
            TRY_CONVERT(DATETIME, s.ReceiveDate),
            CAST(s.ShipmentQty AS INT),
            0,
            CASE
                WHEN NULLIF(LTRIM(RTRIM(s.StockQty)), '') IS NOT NULL AND TRY_CAST(s.StockQty AS INT) IS NOT NULL
                THEN CAST(s.StockQty AS INT)
                ELSE CAST(s.ShipmentQty AS INT)
            END,
            u.user_id,
            NULLIF(LTRIM(RTRIM(s.BillNo)), ''),
            NULLIF(LTRIM(RTRIM(s.InvoiceNo)), ''),
            COALESCE(
                NULLIF(s.Remark, ''),
                CASE
                    WHEN NULLIF(LTRIM(RTRIM(s.RnD)), '') IS NOT NULL
                         OR NULLIF(LTRIM(RTRIM(s.OutputDate)), '') IS NOT NULL
                         OR NULLIF(LTRIM(RTRIM(s.Receiver)), '') IS NOT NULL
                    THEN CONCAT(
                        CASE WHEN NULLIF(LTRIM(RTRIM(s.RnD)), '') IS NOT NULL THEN 'RnD: ' + LTRIM(RTRIM(s.RnD)) + '; ' ELSE '' END,
                        CASE WHEN NULLIF(LTRIM(RTRIM(s.OutputDate)), '') IS NOT NULL THEN 'Output: ' + LTRIM(RTRIM(s.OutputDate)) + '; ' ELSE '' END,
                        CASE WHEN NULLIF(LTRIM(RTRIM(s.Receiver)), '') IS NOT NULL THEN 'Receiver: ' + LTRIM(RTRIM(s.Receiver)) ELSE '' END
                    )
                    ELSE NULL
                END
            )
        FROM dbo.Staging_InventoryImport s
        INNER JOIN dbo.Projects  p ON p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName))
        INNER JOIN dbo.Builds    b ON b.ProjectId = p.ProjectId AND b.BuildCode = LTRIM(RTRIM(s.BuildCode))
        INNER JOIN dbo.Materials m ON m.MaterialName = LTRIM(RTRIM(s.MaterialName))
        LEFT  JOIN dbo.users     u ON u.employee_code = LTRIM(RTRIM(s.EmployeeCode))
        WHERE s.ImportID = @ImportID
          AND s.IsValid  = 1;

        SET @Inserted = @@ROWCOUNT;
        SET @Skipped  = @StagingCount - @Inserted;

        -- 4. Update History
        DECLARE @Status NVARCHAR(20) =
            CASE WHEN @Inserted = @StagingCount THEN 'SUCCESS'
                 WHEN @Inserted > 0 THEN 'PARTIAL'
                 ELSE 'FAILED' END;

        UPDATE dbo.FileImportHistory
        SET TotalRows  = @Inserted,
            ImportDate = GETDATE(),
            Status     = @Status
        WHERE ImportID = @ImportID;

        -- 5. Dọn dẹp bản ghi hợp lệ khỏi Staging
        DELETE FROM dbo.Staging_InventoryImport 
        WHERE ImportID = @ImportID AND IsValid = 1;

        COMMIT TRANSACTION;

        SELECT
            @ImportID     AS ImportID,
            @StagingCount AS StagedRows,
            @Inserted     AS InsertedRows,
            @Skipped      AS SkippedRows,
            GETDATE()     AS ProcessedAt;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        ;THROW
    END CATCH
END;
GO