Add-Type -AssemblyName System.Drawing

$jsonPath = "E:\earthyelectronics\backend\matched_40_user_images_report.json"
$publicProductsDir = "E:\earthyelectronics\frontend\public\images\products"

$items = Get-Content $jsonPath | ConvertFrom-Json

Write-Host "=================================================="
Write-Host "🎨 WHITENING ALL 40 USER MATCHED IMAGES VIA POWERSHELL"
Write-Host "=================================================="

$count = 0

foreach ($item in $items) {
    if ($item.targetPath -and $item.targetPath -ne 'None') {
        $fname = [System.IO.Path]::GetFileName($item.targetPath)
        $absPath = Join-Path $publicProductsDir $fname

        if (Test-Path $absPath) {
            $bmp = [System.Drawing.Bitmap]::FromFile($absPath)
            $whiteBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

            for ($x = 0; $x -lt $bmp.Width; $x++) {
                for ($y = 0; $y -lt $bmp.Height; $y++) {
                    $pixel = $bmp.GetPixel($x, $y)
                    if ($pixel.A -lt 50 -or ($pixel.R -gt 235 -and $pixel.G -gt 235 -and $pixel.B -gt 235)) {
                        $whiteBmp.SetPixel($x, $y, [System.Drawing.Color]::White)
                    } else {
                        $whiteBmp.SetPixel($x, $y, $pixel)
                    }
                }
            }

            $bmp.Dispose()
            $whiteBmp.Save($absPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $whiteBmp.Dispose()
            $count++
            Write-Host "✅ Whitened & Saved: $fname"
        }
    }
}

Write-Host "=================================================="
Write-Host "🎉 SUCCESS: $count / 40 IMAGES WHITENED & CLEANED!"
Write-Host "=================================================="
