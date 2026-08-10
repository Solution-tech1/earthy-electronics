Add-Type -AssemblyName System.Drawing

$srcPath = "E:\earthyelectronics\frontend\public\images\earthyelectronics_official_banner_logo.png"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

$minX = $bmp.Width
$minY = $bmp.Height
$maxX = 0
$maxY = 0

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.A -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$cropWidth = ($maxX - $minX) + 1
$cropHeight = ($maxY - $minY) + 1

$rect = New-Object System.Drawing.Rectangle($minX, $minY, $cropWidth, $cropHeight)
$croppedBmp = $bmp.Clone($rect, $bmp.PixelFormat)

$bmp.Dispose()

$croppedBmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)
$croppedBmp.Dispose()

Write-Host "✅ Successfully cropped all 100% transparent margins! New Bounding Box: $cropWidth x $cropHeight"
