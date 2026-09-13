# Comprehensive Fix: Excel Import Per-Sheet Mapping & Row Index

## Issues Fixed

### 1. Column Mapping Instability
- Dynamic mapping was unstable across sheets - later sheets overwrote earlier mappings
- Column 9 (LotCode) was sometimes lost

### 2. Row Index Not Preserved
- RowIndex field not populated correctly
- UI showed all errors at rows 5-6

### 3. No Sheet Validation
- Sheets without data were being parsed, causing errors

## Files Modified

### 1. Database: `import_infrastructure.sql`
- Added `RowIndex INT` column migration
- Added `SheetName NVARCHAR(255)` column migration

### 2. Backend: `src/services/importService.js`
- Added `FIXED_COLUMN_MAP` constant with fixed column positions
- Added `hasLotCodeColumn()` validation function
- Added `detectSheetColumnMap()` per-sheet mapping detection
- Implemented per-sheet state tracking (sheetColumnMap, sheetName, sheetSkipped)
- Added sheet statistics logging

### 3. Controller: `src/controllers\\inventoryImportController.js`
- Updated error query to SELECT `RowIndex`, `SheetName`
- Changed ORDER BY to `SheetName, RowIndex`

### 4. Frontend: `src\\components\\ExcelImporter.jsx`
- Added "Sheet" column to error table
- Display `err.SheetName` in error table body

## Excel Column Mapping

| Column | Index | Field |
|--------|-------|-------|
| A | 1 | ReceiveDate |
| B | 2 | ProjectName |
| C | 3 | BuildCode |
| D | 4 | Description |
| E | 5 | MaterialName |
| F | 6 | VendorName |
| G | 7 | Config |
| H | 8 | EmployeeCode |
| I | 9 | **LotCode** |
| J | 10 | ShipmentQty |
| K | 11 | OutputDate |
| L | 12 | StockQty |
| M | 13 | Remark |
| N | 14 | BillNo |
| O | 15 | InvoiceNo |

## Deployment
1. Execute SQL migration in SSMS
2. Restart Node.js backend
3. Frontend changes auto-loaded via Vite HMR