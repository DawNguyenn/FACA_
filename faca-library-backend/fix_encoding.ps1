# Fix corrupted section in import_infrastructure_v2.sql using byte-level manipulation

$file = 'd:\faca-library\faca-library-backend\import_infrastructure_v2.sql'

# Read the file as bytes to preserve encoding
$bytes = [System.IO.File]::ReadAllBytes($file)

# Convert to UTF-8 string
$utf8 = New-Object System.Text.UTF8Encoding $false, $true
$content = $utf8.GetString($bytes)

# Define the old corrupted block (from line 164 to just before line 179)
# We need to match exactly what's in the file
$oldBlock = @"
        -- PhÆ°Æ¡ng Ã¡n 2: GÃ¡n IsValid = 1 cho Táº¤T Cáº¢ cÃ¡c dÃ²ng há»£p lá»‡
        -- KhÃ´ng Ä‘Ã¡nh lá»—i trÃ¹ng láº·p, sáº½ dÃ¹ng FinalLotCode vá»›i háº­u tá»‘ -1, -2, -3...
        UPDATE s SET s.IsValid = 1
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID AND s.ErrorMessage IS NULL;

        -- PhÆ°Æ¡ng Ã¡n 2: KhÃ´ng Ä‘Ã¡nh lá»—i trÃ¹ng láº·p, dÃ¹ng FinalLotCode vá»›i háº­u tá»‘ -1, -2, -3...        -- C. INSERT INTO INVENTORYLOTS
"@

# Define the new clean block with proper Vietnamese
$newBlock = @"
        -- Phương án 2: Gán IsValid = 1 cho TẤT CẢ các dòng hợp lệ
        -- Không đánh lỗi trùng lặp, sẽ dùng FinalLotCode với hậu tố -1, -2, -3...
        UPDATE s SET s.IsValid = 1
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID AND s.ErrorMessage IS NULL;

        -- Phương án 2: Không đánh lỗi trùng lặp, dùng FinalLotCode với hậu tố -1, -2, -3...

        -- C. INSERT INTO INVENTORYLOTS
"@

# Replace
if ($content.Contains($oldBlock)) {
    $content = $content.Replace($oldBlock, $newBlock)
    $utf8Bytes = $utf8.GetBytes($content)
    [System.IO.File]::WriteAllBytes($file, $utf8Bytes)
    Write-Host 'Fixed corrupted section'
} else {
    Write-Host 'Old block not found - trying alternate approach'
}

# Verify
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
Write-Host "Line 164: $($lines[163])"
Write-Host "Line 170: $($lines[169])"
