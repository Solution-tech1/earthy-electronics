Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\HP\.gemini\antigravity\brain\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5\earthy_electronics_full_banner_logo_v1_1785395144445.jpg"
$destPath = "E:\earthyelectronics\frontend\public\images\earthyelectronics_official_banner_logo.png"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$transparentBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.R -gt 235 -and $pixel.G -gt 235 -and $pixel.B -gt 235) {
            $transparentBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        } else {
            $transparentBmp.SetPixel($x, $y, $pixel)
        }
    }
}

$transparentBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$transparentBmp.Dispose()
Write-Host "✅ 100% Transparent PNG Created Successfully via PowerShell System.Drawing!"
