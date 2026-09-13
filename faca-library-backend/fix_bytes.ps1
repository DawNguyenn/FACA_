# Fix corrupted section in import_infrastructure_v2.sql
# Using raw byte manipulation to preserve encoding

$file = 'd:\faca-library\faca-library-backend\import_infrastructure_v2.sql'

# Read entire file as bytes
$bytes = [System.IO.File]::ReadAllBytes($file)

# Detect encoding - try UTF-8 first (no BOM)
# The file appears to have UTF-8 bytes that got corrupted when saved
# We'll decode, fix lines, and re-encode

$encoding = [System.Text.UTF8Encoding]::new($false, $true)
$content = $encoding.GetString($bytes)

# Split into lines
$lineArray = $content -split "`r`n"

# Print problematic lines to see exact bytes
Write-Host "Line 163 (0-indexed): $($lineArray[162])"
Write-Host "Line 164: $($lineArray[163])"
Write-Host "Line 169: $($lineArray[168])"
Write-Host "Line 170: $($lineArray[169])"

# The corrupted text in line 170 has concatenation issue
# We need to fix lines 164-178 (indices 163-177)

# Replace index 169 (line 170) which has corrupted concatenation
# And indices 163-168 (lines 164-169) with clean versions

$cleanLines164to169 = @(
    '        -- Phương án 2: Gán IsValid = 1 cho TẤT CẢ các dòng hợp lệ',
    '        -- Không đánh lỗi trùng lặp, sẽ dùng FinalLotCode với hậu tố -1, -2, -3...',
    '        UPDATE s SET s.IsValid = 1',
    '        FROM dbo.Staging_InventoryImport s',
    '        WHERE s.ImportID = @ImportID AND s.ErrorMessage IS NULL;',
    ''
)

$cleanLines170to178 = @(
    '        -- Phương án 2: Không đánh lỗi trùng lặp, dùng FinalLotCode với hậu tố -1, -2, -3...',
    '',
    '        -- C. INSERT INTO INVENTORYLOTS'
)

# Replace lines 164-178 (indices 163-177)
$lineArray[163..177] = $cleanLines164to169 + $cleanLines170to178

# Join back
$newContent = $lineArray -join "`r`n"

# Write back as UTF-8 with BOM to ensure proper encoding
$utf8WithBom = [System.Text.UTF8Encoding]::new($true, $true)
$bytesOut = $utf8WithBom.GetBytes($newContent)
[System.IO.File]::WriteAllBytes($file, $bytesOut)

Write-Host 'File fixed and saved with UTF-8 BOM'

# Verify
$verifyLines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
Write-Host "Verified line 164: $($verifyLines[163])"
Write-Host "Verified line 170: $($verifyLines[169])"
