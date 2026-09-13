# Final Fix: Import Service - Schema Sync & Empty Row Filtering

## Issues Fixed

### 1. Bulk Load Schema Mismatch
**Error:** "The schema of the BulkLoad does not match the schema of the table"

**Root Cause:** Column order/type in Node.js `sql.Table` didn't match SQL Server table exactly.

**Fix:** 
- Aligned `createStagingTable()` column order exactly with SQL Server table
- Used `null` for empty values instead of empty strings for nullable columns
- Added `isEmptyRow()` function to filter empty rows before insert

### 2. Empty Rows Being Parsed
**Error:** Rows like Row 205 (summary/total rows) had LotCode = undefined

**Fix:**
```javascript
function isEmptyRow(mapped) {
    const requiredFields = ['projectName', 'materialName', 'lotCode', 'shipmentQty'];
    return requiredFields.every(field => {
        const val = mapped[field];
        return !val || val.trim() === '';
    });
}
```

### 3. Duplicate Functions Cleanup
- Removed duplicate `normalizeHeader`, `buildColumnMapFromHeader`
- Removed old `COLUMN_MAPPING`, `EXCEL_EPOCH` constants
- Cleaned up exports

## SQL Server Table Schema (Expected)

```sql
CREATE TABLE dbo.Staging_InventoryImport (
    ImportID INT NOT NULL,
    RowNumber INT NULL,
    RowIndex INT NULL,
    SheetName NVARCHAR(100) NULL,
    FileName NVARCHAR(255) NOT NULL,
    ProjectName NVARCHAR(255) NULL,
    BuildCode NVARCHAR(255) NULL,
    MaterialName NVARCHAR(255) NULL,
    VendorName NVARCHAR(255) NULL,
    Description NVARCHAR(500) NULL,
    Config NVARCHAR(255) NULL,
    LotCode NVARCHAR(100) NULL,
    ReceiveDate NVARCHAR(50) NULL,
    ShipmentQty NVARCHAR(50) NULL,
    RnD NVARCHAR(100) NULL,
    StockQty NVARCHAR(50) NULL,
    OutputDate NVARCHAR(50) NULL,
    Receiver NVARCHAR(255) NULL,
    EmployeeCode NVARCHAR(50) NULL,
    BillNo NVARCHAR(100) NULL,
    InvoiceNo NVARCHAR(100) NULL,
    Remark NVARCHAR(MAX) NULL,
    IsValid BIT NOT NULL DEFAULT 0,
    ErrorMessage NVARCHAR(1000) NULL
);
```

## Migration Script

```sql
-- Add RowIndex if not exists
IF COL_LENGTH('dbo.Staging_InventoryImport', 'RowIndex') IS NULL
    ALTER TABLE dbo.Staging_InventoryImport ADD RowIndex INT NULL;
GO

-- Add SheetName if not exists
IF COL_LENGTH('dbo.Staging_InventoryImport', 'SheetName') IS NULL
    ALTER TABLE dbo.Staging_InventoryImport ADD SheetName NVARCHAR(100) NULL;
GO
```

## Key Changes in importService.js

1. **createStagingTable()** - Column order matches SQL Server exactly
2. **flushBatch()** - Uses `null` for empty nullable fields
3. **isEmptyRow()** - Filters rows where all required fields are empty
4. **Per-sheet mapping** - Each sheet has its own column map
5. **Sheet skipping** - Sheets without LotCode column are skipped

## Deployment

1. Run SQL migration script in SSMS
2. Replace `src/services/importService.js` with updated version
3. Restart Node.js backend
4. Test with Excel file containing multiple sheets