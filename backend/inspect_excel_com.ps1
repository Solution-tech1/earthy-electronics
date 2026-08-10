$folder = "E:\earthyelectronics\backend\all products files"
$files = Get-ChildItem -Path $folder -Filter "*.xlsx"

foreach ($file in $files) {
    Write-Host "=================================================="
    Write-Host "📄 FILE: $($file.Name)"
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $wb = $excel.Workbooks.Open($file.FullName)
    $sheet = $wb.Sheets.Item(1)

    for ($r = 1; $r -le [Math]::Min(15, $sheet.UsedRange.Rows.Count); $r++) {
        $rowVals = @()
        for ($c = 1; $c -le [Math]::Min(10, $sheet.UsedRange.Columns.Count); $c++) {
            $val = $sheet.Cells.Item($r, $c).Text
            if ($val) { $rowVals += $val }
        }
        if ($rowVals.Count -gt 0) {
            $txt = $rowVals -join ' | '
            Write-Host "Row ${r}: ${txt}"
        }
    }
    $wb.Close($false)
    $excel.Quit()
}