# Fix corrupted section in import_infrastructure_v2.sql
# Lines 164-178 (1-indexed) need to be replaced with clean Vietnamese text

$file = 'd:\faca-library\faca-library-backend\import_infrastructure_v2.sql'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# The corrupted lines 164-178 (0-indexed: 163-177) need to be replaced
# New clean section to insert

$newSection = @(
    '        -- Phương án 2: Gán IsValid = 1 cho TẤT CẢ các dòng hợp lệ',
    '        -- Không đánh lỗi trùng lặp, sẽ dùng FinalLotCode với hậu tố -1, -2, -3...',
    '        UPDATE s SET s.IsValid = 1',
    '        FROM dbo.Staging_InventoryImport s',
    '        WHERE s.ImportID = @ImportID AND s.ErrorMessage IS NULL;',
    '',
    '        -- Phương án 2: Không đánh lỗi trùng lặp, dùng FinalLotCode với hậu tố -1, -2, -3...',
    '',
    '        -- C. INSERT INTO INVENTORYLOTS'
)

# Lines 164-178 are indices 163-177
# Replace them with new section
$lines[163..177] = $newSection

[System.IO.File]::WriteAllLines($file, $lines, [System.Text.Encoding]::UTF8)
Write-Host 'Fixed lines 164-178'