# Fix Summary: Excel Import FK Mapping & Row Index Issues

## Issues Fixed

### 1. Column Mapping Instability (Lỗi mapping cột nhảy vị trí)

**Problem:** Dynamic column mapping was unstable - column positions varied between sheets/rows, causing LotCode to be lost and triggering duplicate/missing LotCode errors.

**Solution:** Replaced dynamic mapping with fixed column positions based on the actual Excel file structure:
- Column 2 (B): ProjectName (Model)
- Column 3 (C): BuildCode (Build)
- Column 5 (E): MaterialName (Material)
- Column 6 (F): VendorName (Vendor)
- Column 9 (I): LotCode (Lot ID)
- Column 10 (J): ShipmentQty
- Column 12 (L): StockQty (Qty Tồn Kho)

### 2. Row Index Not Preserved (Lỗi chỉ số dòng)

**Problem:** All errors showed rows 5-6 because the actual Excel row number wasn't saved to the staging table.

**Solution:** Added `RowIndex INT` column to `Staging_InventoryImport` table. Now `rowNumber` from Excel is passed directly to `RowIndex` during bulk insert.

## Files Modified

### 1. Database: `import_infrastructure.sql`

**Changes:**
- Added migration script to add `RowIndex INT` column to `Staging_InventoryImport` (if not exists)
- RowIndex is preserved through validation and error reporting

### 2. Backend: `src/services/importService.js`

**Changes:**
- Updated `COLUMN_MAPPING` to use fixed column positions (B=2, C=3, E=5, F=6, I=9, J=10, L=12)
- Added `RowIndex` column to `createStagingTable()` function
- Updated `flushBatch()` to include `RowIndex` in bulk insert
- Replaced dynamic column mapping with direct fixed-position access:
  ```javascript
  const getVal = (colIndex) => values[colIndex] !== undefined ? values[colIndex] : '';
  ```
- Added `rowIndex: rowNumber` to mapped object
- Cleaned up unused exports (HEADER_ALIASES, buildColumnMapFromHeader, findKeyByValue)
- Added helpful logging for debugging

### 3. Controller: `src/controllers/inventoryImportController.js`

**Changes:**
- Updated error query to SELECT `RowIndex`
- Changed ORDER BY from `RowNumber` to `RowIndex`

### 4. Frontend: `src/components/ExcelImporter.jsx`

**Changes:**
- Updated error table to display `err.RowIndex || err.RowNumber` instead of just `err.RowNumber`

## Excel Column Mapping Reference

| Excel Column | Index | Field Name | Description |
|-------------|-------|------------|-------------|
| A | 1 | ReceiveDate | Change Date / Received Date |
| B | 2 | ProjectName | Model |
| C | 3 | BuildCode | Build |
| D | 4 | Description | Material Description |
| E | 5 | MaterialName | Material |
| F | 6 | VendorName | Vendor/Supplier |
| G | 7 | Config | Configuration |
| H | 8 | EmployeeCode | DRI / Mã NV (or RnD) |
| I | 9 | LotCode | Lot ID |
| J | 10 | ShipmentQty | Quantity Shipped |
| K | 11 | OutputDate | Output Date |
| L | 12 | StockQty | Qty Tồn Kho |
| M | 13 | Remark | Ghi Chú (or Receiver) |
| N | 14 | BillNo | Bill Number |
| O | 15 | InvoiceNo | I/V (Invoice) |

## Deployment Steps

1. **Database:** Execute the updated `import_infrastructure.sql` in SSMS
2. **Backend:** Restart the Node.js server
3. **Frontend:** No changes needed (already compatible)

## Verification

After deployment:
1. Upload an Excel file with multiple sheets
2. Check that all rows are processed correctly
3. Verify that error reports show correct Excel row numbers
4. Confirm that LotCode is no longer lost due to column mapping issues
