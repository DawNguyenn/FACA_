# Fix: Duplicate LotCode Logic - Option A (Keep First, Mark Rest)

## Problem
- Check 3 đánh dấu lỗi "Mã Lot ID bị trùng lặp trong file Excel" lên TẤT CẢ các dòng có LotCode xuất hiện > 1 lần
- Hệ quả: Cả dòng gốc (dòng xuất hiện đầu tiên) lẫn các dòng lặp lại sau đó đều bị từ chối import

## Solution - Option A: Giữ lại dòng đầu tiên, chỉ đánh lỗi từ dòng trùng thứ 2 trở đi

### New Check 3 Logic (ROW_NUMBER)

```sql
;WITH CTE_Duplicates AS (
    SELECT 
        StagingID,
        ROW_NUMBER() OVER (
            PARTITION BY LTRIM(RTRIM(LotCode)) 
            ORDER BY RowIndex ASC, StagingID ASC
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
  AND d.RowNum > 1
  AND s.ErrorMessage IS NULL;
```

### Key Points
1. **ROW_NUMBER()** đánh số thứ tự cho mỗi LotCode (PARTITION BY LotCode)
2. **ORDER BY RowIndex ASC, StagingID ASC** - ưu tiên dòng xuất hiện đầu tiên trong file
3. **d.RowNum > 1** - chỉ đánh lỗi các dòng từ lần 2 trở đi
4. Dòng đầu tiên (RowNum = 1) được giữ lại và import bình thường

## Migration Required

### Add StagingID Column
```sql
-- Chạy trong SSMS nếu chưa có StagingID
IF COL_LENGTH('dbo.Staging_InventoryImport', 'StagingID') IS NULL
BEGIN
    ALTER TABLE dbo.Staging_InventoryImport
        ADD StagingID INT IDENTITY(1,1) NOT NULL;
    ALTER TABLE dbo.Staging_InventoryImport
        ADD CONSTRAINT PK_Staging_InventoryImport PRIMARY KEY (StagingID);
END
GO
```

## Files
- **New file**: `import_infrastructure_v2.sql` - Complete updated script
- **Old file**: `import_infrastructure.sql` - Keep for reference

## Deployment Steps
1. Execute `import_infrastructure_v2.sql` in SSMS
2. Verify StagingID column exists
3. Test with Excel file containing duplicate LotCodes
4. Check that only duplicate rows (2nd+) are marked as errors