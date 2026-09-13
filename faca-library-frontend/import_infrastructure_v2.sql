-- =============================================
-- STEP 1: CHECK & ADD COLUMNS (BATCH 1)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Staging_InventoryImport') AND name = 'RowIndex')
    ALTER TABLE dbo.Staging_InventoryImport ADD RowIndex INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Staging_InventoryImport') AND name = 'SheetName')
    ALTER TABLE dbo.Staging_InventoryImport ADD SheetName NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Staging_InventoryImport') AND name = 'StagingID')
    ALTER TABLE dbo.Staging_InventoryImport ADD StagingID INT IDENTITY(1,1);
GO

-- =============================================
-- STEP 2: CREATE OR ALTER PROCEDURE (BATCH 2)
-- =============================================
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
    END;

    SELECT @StagingCount = COUNT(*)
    FROM dbo.Staging_InventoryImport WHERE ImportID = @ImportID;

    BEGIN TRANSACTION;
    BEGIN TRY

        -- A. AUTO-PROVISIONING (Projects, Vendors, Builds, Materials)
        IF OBJECT_ID('dbo.MaterialTypes', 'U') IS NOT NULL
        BEGIN
            SELECT TOP 1 @DefaultMaterialTypeId = MaterialTypeId FROM dbo.MaterialTypes;
            IF @DefaultMaterialTypeId IS NULL
            BEGIN
                INSERT INTO dbo.MaterialTypes (MaterialTypeName) VALUES (N'General / KhÃ¡c');
                SET @DefaultMaterialTypeId = SCOPE_IDENTITY();
            END
        END;

        IF OBJECT_ID('dbo.Vendors', 'U') IS NOT NULL
        BEGIN
            SELECT TOP 1 @DefaultVendorId = VendorID FROM dbo.Vendors;
            IF @DefaultVendorId IS NULL
            BEGIN
                INSERT INTO dbo.Vendors (VendorName, Country, IsActive) VALUES (N'Unknown / KhÃ¡c', N'N/A', 1);
                SET @DefaultVendorId = SCOPE_IDENTITY();
            END
        END;

        INSERT INTO dbo.Projects (ProjectCode, ProjectName)
        SELECT DISTINCT LTRIM(RTRIM(s.ProjectName)), LTRIM(RTRIM(s.ProjectName))
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND NULLIF(LTRIM(RTRIM(s.ProjectName)), '') IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM dbo.Projects p
              WHERE p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName))
          );

        IF OBJECT_ID('dbo.Vendors', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dbo.Vendors (VendorName)
            SELECT DISTINCT LTRIM(RTRIM(s.VendorName))
            FROM dbo.Staging_InventoryImport s
            WHERE s.ImportID = @ImportID
              AND NULLIF(LTRIM(RTRIM(s.VendorName)), '') IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.Vendors v WHERE v.VendorName = LTRIM(RTRIM(s.VendorName))
              );
        END;

        INSERT INTO dbo.Builds (BuildCode, ProjectId)
        SELECT DISTINCT LTRIM(RTRIM(s.BuildCode)), p.ProjectId
        FROM dbo.Staging_InventoryImport s
        INNER JOIN dbo.Projects p ON p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName))
        WHERE s.ImportID = @ImportID
          AND NULLIF(LTRIM(RTRIM(s.BuildCode)), '') IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM dbo.Builds b WHERE b.BuildCode = LTRIM(RTRIM(s.BuildCode)) AND b.ProjectId = p.ProjectId
          );

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
              SELECT 1 FROM dbo.Materials m WHERE m.MaterialName = LTRIM(RTRIM(s.MaterialName))
          );

        -- B. RESET & VALIDATION CHECKS
        UPDATE dbo.Staging_InventoryImport
        SET IsValid = 0, ErrorMessage = NULL
        WHERE ImportID = @ImportID;

        -- Check 1: Rá»—ng LotCode
        UPDATE s
        SET s.ErrorMessage = N'Thiáº¿u mÃ£ Lot (Lot ID)'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND NULLIF(LTRIM(RTRIM(s.LotCode)), '') IS NULL;

        -- Check 2: TrÃ¹ng LotCode Ä‘Ã£ cÃ³ trong InventoryLots
        UPDATE s
        SET s.ErrorMessage = N'Mã Lot ID đã tồn tại trong hệ thống kho'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND EXISTS (
              SELECT 1 FROM dbo.InventoryLots il 
              WHERE LTRIM(RTRIM(il.LotCode)) = LTRIM(RTRIM(s.LotCode))
          );

        -- Check 3: TrÃ¹ng LotCode trong cÃ¹ng file Import (DÃ¹ng CTE ROW_NUMBER Ä‘á»ƒ giá»¯ dÃ²ng Ä‘áº§u tiÃªn)
        ;WITH CTE_Duplicates AS (
            SELECT 
                StagingID,
                ROW_NUMBER() OVER (
                    PARTITION BY LTRIM(RTRIM(LotCode)) 
                    ORDER BY StagingID ASC
                ) AS RowNum
            FROM dbo.Staging_InventoryImport
            WHERE ImportID = @ImportID
              AND NULLIF(LTRIM(RTRIM(LotCode)), '') IS NOT NULL
        )
        UPDATE s
        SET s.ErrorMessage = N'Mã Lot ID bị trùng lặp với dòng trước đó trong file Excel'
        FROM dbo.Staging_InventoryImport s
        INNER JOIN CTE_Duplicates d ON s.StagingID = d.StagingID
        WHERE s.ImportID = @ImportID
          AND d.RowNum > 1;

        -- Check 4: Sai Receive Date
        UPDATE s
        SET s.ErrorMessage = N'Ngày nhận (Receive Date) không hợp lệ'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND (NULLIF(LTRIM(RTRIM(s.ReceiveDate)), '') IS NULL OR COALESCE(TRY_CONVERT(DATETIME, s.ReceiveDate), GETDATE()) IS NULL);

        -- Check 5: Sai Shipment Qty
        UPDATE s
        SET s.ErrorMessage = N'Sá»‘ lÆ°á»£ng Shipment Qty pháº£i lÃ  sá»‘ nguyÃªn khÃ´ng Ã¢m'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND (NULLIF(LTRIM(RTRIM(s.ShipmentQty)), '') IS NULL OR TRY_CAST(s.ShipmentQty AS INT) IS NULL OR TRY_CAST(s.ShipmentQty AS INT) < 0);

        -- Check 6: Lá»—i liÃªn káº¿t FK
        UPDATE s
        SET s.ErrorMessage = N'KhÃ´ng thá»ƒ liÃªn káº¿t Project, Build hoáº·c Váº­t liá»‡u'
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID
          AND s.ErrorMessage IS NULL
          AND NOT (
              EXISTS (SELECT 1 FROM dbo.Projects p WHERE p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName)))
              AND EXISTS (SELECT 1 FROM dbo.Materials m WHERE m.MaterialName = LTRIM(RTRIM(s.MaterialName)))
          );

        -- Marking Valid Rows
        UPDATE dbo.Staging_InventoryImport
        SET IsValid = 1
        WHERE ImportID = @ImportID AND ErrorMessage IS NULL;

        -- C. INSERT INTO INVENTORYLOTS
        -- Protection against duplicate LotCode causing UNIQUE KEY Violation
        -- Use CTE with ROW_NUMBER to ensure only one row per LotCode is inserted
        ;WITH CTE_UniqueLots AS (
            SELECT 
                s.ImportID,
                s.StagingID,
                ROW_NUMBER() OVER (
                    PARTITION BY LTRIM(RTRIM(s.LotCode)) 
                    ORDER BY s.RowIndex ASC, s.StagingID ASC
                ) AS LotRowNum
            FROM dbo.Staging_InventoryImport s
            WHERE s.ImportID = @ImportID
              AND s.IsValid = 1
              AND NULLIF(LTRIM(RTRIM(s.LotCode)), '') IS NOT NULL
        )
        INSERT INTO dbo.InventoryLots
            (ProjectID, BuildID, MaterialID, LotCode,
             ReceiveDate, ShipmentQty, IQAScrapQty, StockQty,
             DRI, BillNo, InvoiceNo, Remark)
        SELECT
            p.ProjectId,
            b.BuildId,
            m.MaterialID,
            LTRIM(RTRIM(s.LotCode)),
            COALESCE(TRY_CONVERT(DATETIME, s.ReceiveDate), GETDATE()),
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
        INNER JOIN CTE_UniqueLots ul ON s.StagingID = ul.StagingID AND ul.LotRowNum = 1
        INNER JOIN dbo.Projects  p ON p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName))
        INNER JOIN dbo.Builds    b ON b.ProjectId = p.ProjectId AND b.BuildCode = LTRIM(RTRIM(s.BuildCode))
        INNER JOIN dbo.Materials m ON m.MaterialName = LTRIM(RTRIM(s.MaterialName))
        LEFT  JOIN dbo.users     u ON u.employee_code = LTRIM(RTRIM(s.EmployeeCode))
        WHERE s.ImportID = @ImportID
          AND s.IsValid  = 1
          AND NOT EXISTS (
              SELECT 1 FROM dbo.InventoryLots il 
              WHERE LTRIM(RTRIM(il.LotCode)) = LTRIM(RTRIM(s.LotCode))
          );

        SET @Inserted = @@ROWCOUNT;
        SET @Skipped  = @StagingCount - @Inserted;

        -- D. UPDATE FILE IMPORT HISTORY
        DECLARE @Status NVARCHAR(20) =
            CASE WHEN @Inserted = @StagingCount THEN 'SUCCESS'
                 WHEN @Inserted > 0 THEN 'PARTIAL'
                 ELSE 'FAILED' END;

        UPDATE dbo.FileImportHistory
        SET TotalRows  = @Inserted,
            ImportDate = GETDATE(),
            Status     = @Status
        WHERE ImportID = @ImportID;

        -- E. CLEANUP STAGING VALID ROWS
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
        THROW;
    END CATCH
END;
GO



