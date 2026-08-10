const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function inspectXlsxZipContents() {
  console.log("==================================================");
  console.log("🔍 EXTRACTING AND INSPECTING EXCEL SHEET TEXT VIA POWERSHELL");
  console.log("==================================================");

  const psScript = `
    $folder = "E:\\earthyelectronics\\backend\\all products files"
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
                Write-Host "Row $r: $($rowVals -join ' | ')"
            }
        }
        $wb.Close($false)
        $excel.Quit()
    }
  `;

  const scriptPath = path.join(__dirname, 'inspect_excel_com.ps1');
  fs.writeFileSync(scriptPath, psScript, 'utf8');

  try {
    const out = execSync("powershell -ExecutionPolicy Bypass -File inspect_excel_com.ps1", { cwd: __dirname });
    console.log(out.toString());
  } catch (e) {
    console.log("COM Error or PowerShell output:", e.stdout ? e.stdout.toString() : e.message);
  }
}

inspectXlsxZipContents();
