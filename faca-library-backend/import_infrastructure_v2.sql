CREATE OR ALTER PROCEDURE dbo.sp_ProcessInventoryImport
    @ImportID INT,
    @UserID   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @StagingCount INT = 0;
    DECLARE @Inserted     INT = 0;
    DECLARE @Skipped      INT = 0;
    DECLARE @DefaultMaterialTypeId INT;
    DECLARE @DefaultVendorId INT;

    -- 1. Kiểm tra tồn tại dữ liệu staging
    IF NOT EXISTS (SELECT 1 FROM dbo.Staging_InventoryImport WHERE ImportID = @ImportID)
    BEGIN
        RAISERROR ('No staged rows found for ImportID = %d.', 16, 1, @ImportID);
        RETURN -1;
    END;

    -- Lấy tổng số dòng ban đầu của ImportID này
    SELECT @StagingCount = COUNT(*)
    FROM dbo.Staging_InventoryImport WHERE ImportID = @ImportID;

    BEGIN TRANSACTION;
    BEGIN TRY

        -- A. Auto-provisioning dữ liệu danh mục cơ bản nếu thiếu
        IF OBJECT_ID('dbo.MaterialTypes', 'U') IS NOT NULL
        BEGIN
            SELECT TOP 1 @DefaultMaterialTypeId = MaterialTypeId FROM dbo.MaterialTypes;
            IF @DefaultMaterialTypeId IS NULL
            BEGIN
                INSERT INTO dbo.MaterialTypes (MaterialTypeName) VALUES (N'General / Khác');
                SET @DefaultMaterialTypeId = SCOPE_IDENTITY();
            END
        END;

        IF OBJECT_ID('dbo.Vendors', 'U') IS NOT NULL
        BEGIN
            SELECT TOP 1 @DefaultVendorId = VendorID FROM dbo.Vendors;
            IF @DefaultVendorId IS NULL
            BEGIN
                INSERT INTO dbo.Vendors (VendorName, Country, IsActive) VALUES (N'Unknown / Khác', N'N/A', 1);
                SET @DefaultVendorId = SCOPE_IDENTITY();
            END
        END;

        -- B. Đánh dấu lỗi các dòng tổng cộng, dòng trống hoặc thiếu LotCode
        UPDATE dbo.Staging_InventoryImport
        SET IsValid = 0, ErrorMessage = N'Dòng tổng cộng hoặc thiếu thông tin LotCode'
        WHERE ImportID = @ImportID 
          AND (ProjectName LIKE N'%TỔNG CỘNG%' OR MaterialName LIKE N'%TỔNG CỘNG%' OR LotCode IS NULL OR LTRIM(RTRIM(LotCode)) = '');

        -- C. Insert tự động các danh mục thiếu (Projects, Vendors, Builds, Materials)
        INSERT INTO dbo.Projects (ProjectCode, ProjectName)
        SELECT DISTINCT LTRIM(RTRIM(s.ProjectName)), LTRIM(RTRIM(s.ProjectName))
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID AND NULLIF(LTRIM(RTRIM(s.ProjectName)), '') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM dbo.Projects p WHERE p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName)));

        IF OBJECT_ID('dbo.Vendors', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dbo.Vendors (VendorName)
            SELECT DISTINCT LTRIM(RTRIM(s.VendorName))
            FROM dbo.Staging_InventoryImport s
            WHERE s.ImportID = @ImportID AND NULLIF(LTRIM(RTRIM(s.VendorName)), '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM dbo.Vendors v WHERE v.VendorName = LTRIM(RTRIM(s.VendorName)));
        END;

        INSERT INTO dbo.Builds (BuildCode, ProjectId)
        SELECT DISTINCT LTRIM(RTRIM(s.BuildCode)), p.ProjectId
        FROM dbo.Staging_InventoryImport s
        INNER JOIN dbo.Projects p ON p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName))
        WHERE s.ImportID = @ImportID AND NULLIF(LTRIM(RTRIM(s.BuildCode)), '') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM dbo.Builds b WHERE b.BuildCode = LTRIM(RTRIM(s.BuildCode)) AND b.ProjectId = p.ProjectId);

        INSERT INTO dbo.Materials (MaterialName, Description, Config, MaterialTypeID, VendorID)
        SELECT DISTINCT
            LTRIM(RTRIM(s.MaterialName)),
            NULLIF(LTRIM(RTRIM(s.Description)), ''),
            NULLIF(LTRIM(RTRIM(s.Config)), ''),
            @DefaultMaterialTypeId,
            COALESCE(v.VendorID, @DefaultVendorId)
        FROM dbo.Staging_InventoryImport s
        LEFT JOIN dbo.Vendors v ON v.VendorName = LTRIM(RTRIM(s.VendorName))
        WHERE s.ImportID = @ImportID AND NULLIF(LTRIM(RTRIM(s.MaterialName)), '') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM dbo.Materials m WHERE m.MaterialName = LTRIM(RTRIM(s.MaterialName)));

        -- D. Đánh dấu các dòng hợp lệ còn lại
        UPDATE dbo.Staging_InventoryImport
        SET IsValid = 1, ErrorMessage = NULL
        WHERE ImportID = @ImportID 
          AND ProjectName NOT LIKE N'%TỔNG CỘNG%' 
          AND MaterialName NOT LIKE N'%TỔNG CỘNG%' 
          AND LotCode IS NOT NULL 
          AND LTRIM(RTRIM(LotCode)) <> '';

        -- E. Thực hiện Insert dữ liệu hợp lệ vào bảng chính InventoryLots
        ;WITH RankedStaging AS (
            SELECT 
                s.StagingID,
                p.ProjectId,
                b.BuildId,
                m.MaterialID,
                LTRIM(RTRIM(s.LotCode)) AS RawLotCode,
                COALESCE(TRY_CONVERT(DATETIME, s.ReceiveDate), GETDATE()) AS CleanReceiveDate,
                CAST(s.ShipmentQty AS INT) AS CleanShipmentQty,
                COALESCE(TRY_CAST(s.StockQty AS INT), CAST(s.ShipmentQty AS INT)) AS CleanStockQty,
                COALESCE(u.user_id, @UserID) AS DRI_UserId,
                NULLIF(LTRIM(RTRIM(s.BillNo)), '') AS CleanBillNo,
                NULLIF(LTRIM(RTRIM(s.InvoiceNo)), '') AS CleanInvoiceNo,
                s.Remark,
                ROW_NUMBER() OVER (
                    PARTITION BY LTRIM(RTRIM(s.LotCode)) 
                    ORDER BY s.StagingID ASC
                ) as FileRowRank
            FROM dbo.Staging_InventoryImport s
            INNER JOIN dbo.Projects p ON p.ProjectCode = LTRIM(RTRIM(s.ProjectName)) OR p.ProjectName = LTRIM(RTRIM(s.ProjectName))
            INNER JOIN dbo.Builds   b ON b.ProjectId = p.ProjectId AND b.BuildCode = LTRIM(RTRIM(s.BuildCode))
            INNER JOIN dbo.Materials m ON m.MaterialName = LTRIM(RTRIM(s.MaterialName))
            LEFT  JOIN dbo.users     u ON u.employee_code = LTRIM(RTRIM(s.EmployeeCode))
            WHERE s.ImportID = @ImportID AND s.IsValid = 1
        ),
        CalculatedLots AS (
            SELECT 
                ProjectId,
                BuildId,
                MaterialID,
                CleanReceiveDate,
                CleanShipmentQty,
                CleanStockQty,
                DRI_UserId,
                CleanBillNo,
                CleanInvoiceNo,
                Remark,
                CASE 
                    WHEN FileRowRank = 1 AND NOT EXISTS (SELECT 1 FROM dbo.InventoryLots il WHERE il.LotCode = RawLotCode) 
                        THEN RawLotCode
                    ELSE RawLotCode + '-IMP' + CAST(@ImportID AS VARCHAR(10)) + '-' + CAST(FileRowRank AS VARCHAR(10))
                END AS FinalLotCode
            FROM RankedStaging
        )
        INSERT INTO dbo.InventoryLots (
            ProjectID, BuildID, MaterialID, LotCode, ReceiveDate, 
            ShipmentQty, IQAScrapQty, StockQty, DRI, BillNo, InvoiceNo, Remark
        )
        SELECT 
            ProjectId, BuildId, MaterialID, FinalLotCode, CleanReceiveDate,
            CleanShipmentQty, 0, CleanStockQty, DRI_UserId, CleanBillNo, CleanInvoiceNo, Remark
        FROM CalculatedLots;

        -- Lấy đúng số dòng thực tế vừa insert
        SET @Inserted = @@ROWCOUNT;

        -- Tính số dòng lỗi/bỏ qua chính xác dựa trên tổng số trừ đi số thành công
        SELECT @Skipped = COUNT(*) FROM dbo.Staging_InventoryImport WHERE ImportID = @ImportID AND IsValid = 0;

        -- F. Cập nhật lịch sử import
        DECLARE @Status NVARCHAR(20) =
            CASE WHEN @Skipped = 0 THEN 'SUCCESS'
                 WHEN @Inserted > 0 THEN 'PARTIAL'
                 ELSE 'FAILED' END;

        IF OBJECT_ID('dbo.FileImportHistory', 'U') IS NOT NULL
        BEGIN
            UPDATE dbo.FileImportHistory
            SET TotalRows  = @Inserted,
                ImportDate = GETDATE(),
                Status     = @Status
            WHERE ImportID = @ImportID;
        END

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