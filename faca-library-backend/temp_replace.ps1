$file = 'd:\faca-library\faca-library-backend\import_infrastructure_v2.sql'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

$startMarker = '        ;WITH CTE_VALID AS ('
$endMarker   = '        -- C. INSERT INTO INVENTORYLOTS'

$startIdx = $content.IndexOf($startMarker, [System.StringComparison]::Ordinal)
$endIdx   = $content.IndexOf($endMarker, $startIdx, [System.StringComparison]::Ordinal)

if ($startIdx -eq -1 -or $endIdx -eq -1) { 
    Write-Host 'Markers not found'; 
    exit 1 
}

$newBlock = @"
        -- Phương án 2: Gán IsValid = 1 cho TẤT CẢ các dòng hợp lệ
        -- Không đánh lỗi trùng lặp, sẽ dùng FinalLotCode với hậu tố -1, -2, -3...
        UPDATE s SET s.IsValid = 1
        FROM dbo.Staging_InventoryImport s
        WHERE s.ImportID = @ImportID AND s.ErrorMessage IS NULL;

        -- Phương án 2: Không đánh lỗi trùng lặp, dùng FinalLotCode với hậu tố -1, -2, -3...
"@

$content = $content.Substring(0, $startIdx) + $newBlock + $content.Substring($endIdx)

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host 'REPLACED OK'
