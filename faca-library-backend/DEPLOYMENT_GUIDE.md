# Deployment Guide: FK Mapping Fix for Excel Import

## Summary of Changes

This update resolves the "FK mapping or data-type conversion failed" error during Excel import by implementing auto-provisioning of master data.

## Files Modified

### 1. `import_infrastructure.sql`
**Changes:**
- Added `AUTO-PROVISIONING` phase to `sp_ProcessInventoryImport` stored procedure
- Extended `Staging_InventoryImport` table with new columns:
  - `VendorName` - Excel "Vendor" column
  - `Description` - Excel "Description" column
  - `Config` - Excel "Config" column
  - `RnD` - Excel "RnD" column
  - `StockQty` - Excel "Qty Tồn Kho" column
  - `OutputDate` - Excel "Output Date" column
  - `Receiver` - Excel "Receiver" column
- Added detailed error messages for different failure types:
  - Missing required fields
  - Invalid date format
  - Invalid quantity
  - Duplicate LotCode
  - FK mapping failure (when auto-provision fails)
- Updated INSERT statement to use StockQty from Excel when available
- Combines RnD, OutputDate, Receiver into Remark field when Remark is empty

**Auto-Provisioning Logic:**
1. Creates Projects from distinct `ProjectName` values
2. Creates Vendors from distinct `VendorName` values
3. Creates Builds from distinct `BuildCode` values (scoped by Project)
4. Creates Materials from distinct `MaterialName` values (with VendorID, Description, Config)

### 2. `src/services/importService.js`
**Changes:**
- Added header aliases for new Excel columns:
  - Vendor: 'vendor', 'vendor name', 'nhà cung cấp', 'supplier'
  - Description: 'description', 'desc', 'mô tả'
  - Config: 'config', 'configuration', 'cấu hình'
  - RnD: 'rnd', 'r&d', 'research'
  - StockQty: 'qty tồn kho', 'stock qty', 'tồn kho', 'current stock'
  - OutputDate: 'output date', 'output', 'ngày xuất'
  - Receiver: 'receiver', 'người nhận'
- Added 'change date' alias for ReceiveDate
- Updated `COLUMN_MAPPING` to support 17 columns (A-R)
- Updated `createStagingTable()` to include new columns
- Updated `flushBatch()` to include new columns in correct order
- Updated data extraction logic to parse all new columns

## Deployment Steps

### Step 1: Update the Database
1. Open SQL Server Management Studio (SSMS)
2. Connect to your SQL Server instance (`DAWNGUYENN`)
3. Open `import_infrastructure.sql`
4. Execute the entire script
5. Verify the stored procedure was created successfully:
   ```sql
   SELECT OBJECT_ID('dbo.sp_ProcessInventoryImport', 'P') AS ProcedureExists;
   ```

### Step 2: Update the Backend
1. Replace `src/services/importService.js` with the updated version
2. Restart the backend server:
   ```bash
   cd faca-library-backend
   npm run dev
   ```

### Step 3: Verify the Fix
1. Upload an Excel file with new Model/Build/Material values
2. Check that master records are auto-created in:
   - `dbo.Projects`
   - `dbo.Builds`
   - `dbo.Materials`
   - `dbo.Vendors`
3. Verify that the import completes without "FK mapping or data-type conversion failed" errors

## Excel Column Mapping

The import now supports the following Excel columns (in order):

| Column | Field Name | DB Column | Description |
|--------|------------|-----------|-------------|
| A | Model | ProjectName | Project name or code |
| B | Build | BuildCode | Build identifier |
| C | Received (Date) | ReceiveDate | Date received |
| D | Material | MaterialName | Material name or code |
| E | Vendor | VendorName | Vendor/supplier name |
| F | Description | Description | Material description |
| G | Config | Config | Material configuration |
| H | Lot ID | LotCode | Lot identifier |
| I | Shipment Qty | ShipmentQty | Quantity shipped |
| J | RnD | RnD | R&D flag/notes |
| K | Qty Tồn Kho | StockQty | Current stock quantity |
| L | Output Date | OutputDate | Output/ship date |
| M | Receiver | Receiver | Person receiving |
| N | Mã NV | EmployeeCode | Employee code (DRI) |
| O | Ghi Chú | Remark | Notes/comments |
| P | Bill | BillNo | Bill number |
| Q | I/V | InvoiceNo | Invoice number |

## Error Handling

The system now provides specific error messages for different failure types:

1. **Missing required field**: When LotCode, ReceiveDate, or ShipmentQty is empty
2. **Invalid date format**: When ReceiveDate cannot be parsed as a date
3. **Invalid ShipmentQty**: When ShipmentQty is not a non-negative integer
4. **Duplicate LotCode**: When the LotCode already exists in InventoryLots
5. **FK mapping failed**: When auto-provisioning fails to create master records (rare)

## Rollback

If you need to rollback the changes:

1. Restore the previous `import_infrastructure.sql` and re-execute it
2. Restore the previous `importService.js`
3. Restart the backend server

## Notes

- The auto-provisioning logic runs inside a transaction, so if any step fails, all changes are rolled back
- The staging table is dropped and recreated each time the script runs (idempotent)
- Failed rows remain in the staging table for diagnostics ( IsValid = 0 )
- The `FileImportHistory` table now tracks `ErrorRows` count
