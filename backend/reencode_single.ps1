
        Add-Type -AssemblyName System.Drawing
        $abs = "E:\\earthyelectronics\\frontend\\public\\images\\products\\haier-philips-espresso-ep2220-fully-automatic-espresso-machines-on-installments.jpg"
        $img = [System.Drawing.Bitmap]::FromFile($abs)
        $newImg = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.Clear([System.Drawing.Color]::White)
        
        for ($y = 0; $y -lt $img.Height; $y++) {
            for ($x = 0; $x -lt $img.Width; $x++) {
                $c = $img.GetPixel($x, $y)
                # If pixel is dark background or near black border, render pure white
                if ($c.R -le 40 -and $c.G -le 40 -and $c.B -le 40) {
                    $newImg.SetPixel($x, $y, [System.Drawing.Color]::White)
                } else {
                    $newImg.SetPixel($x, $y, $c)
                }
            }
        }
        $img.Dispose()
        $tempPath = $abs + ".tmp.jpg"
        $newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $newImg.Dispose()
        Remove-Item $abs -Force
        Rename-Item $tempPath $abs -Force
      