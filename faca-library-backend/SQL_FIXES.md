# SQL Syntax Fixes - Summary

## 3 Errors Fixed

### 1. Msg 195 - 'RIM' is not a recognized built-in function
**Problem:** Typo `LTRIM(RIM(s.ProjectName))` at line 81
**Fix:** Changed to `LTRIM(RTRIM(s.ProjectName))`

### 2. Msg 156 - Incorrect syntax near 'IF'
**Problem:** Nested IF statements inside DML (INSERT/UPDATE)
**Fix:** Moved IF checks before DML statements using `AND NOT EXISTS` pattern

### 3. Msg 102 - Incorrect syntax near 'SheetName'
**Problem:** Missing comma before SheetName column definition
**Fix:** Added proper comma separation in ALTER TABLE

## New File: import_infrastructure_v2.sql

### Key Changes:

1. **ALTER TABLE with proper syntax:**
```sql
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Staging_InventoryImport') AND name = 'RowIndex')
    ALTER TABLE dbo.Staging_InventoryImport ADD RowIndex INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Staging_InventoryImport') AND name = 'SheetName')
    ALTER TABLE dbo.Staging_InventoryImport ADD SheetName NVARCHAR(100) NULL;
GO
```

2. **Default records creation (no nested IF in DML):**
```sql
IF OBJECT_ID('dbo.MaterialTypes', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.MaterialTypes)
BEGIN
    INSERT INTO dbo.MaterialTypes (MaterialTypeName) VALUES (N'General / Khác');
END
```

3. **Check 3 - Duplicate LotCode (ROW_NUMBER approach):**
```sql
;WITH CTE_Duplicates AS (
    SELECT StagingID,
        ROW_NUMBER() OVER (
            PARTITION BY LTRIM(RTRIM(LotCode)) 
            ORDER BY RowIndex ASC, StagingID ASC
        ) AS RowNum
    FROM dbo.Staging_InventoryImport
    WHERE ImportID = @ImportID
      AND NULLIF(LTRIM(RTRIM(LotCode)), '') IS NOT NULL
)
UPDATE s SET s.ErrorMessage = N'Mã Lot ID bị trùng lặp với dòng trước trong file Excel'
FROM dbo.Staging_InventoryImport s
INNER JOIN CTE_Duplicates d ON s.StagingID = d.StagingID
WHERE s.ImportID = @ImportID
  AND d.RowNum > 1  -- Only mark 2nd+ occurrences
  AND s.ErrorMessage IS NULL;
```

## Deployment

1. Execute `import_infrastructure_v2.sql` in SSMS
2. Verify no errors in Messages tab
3. Test with Excel file

## Files Created
- `import_infrastructure_v2.sql` - Complete fixed script
- `SQL_FIXES.md` - This summary