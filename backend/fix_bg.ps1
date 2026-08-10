
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Bitmap]::FromFile("E:\\earthyelectronics\\frontend\\public\\images\\products\\haier-haier-washing-machine-automatic-single-tub-top-load-12kg-hwm-120-316s6.jpg")
        $newImg = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.Clear([System.Drawing.Color]::White)
        
        for ($y = 0; $y -lt $img.Height; $y++) {
            for ($x = 0; $x -lt $img.Width; $x++) {
                $c = $img.GetPixel($x, $y)
                if ($c.R -gt 35 -or $c.G -gt 35 -or $c.B -gt 35) {
                    $newImg.SetPixel($x, $y, $c)
                }
            }
        }
        $img.Dispose()
        $newImg.Save("E:\\earthyelectronics\\frontend\\public\\images\\products\\haier-haier-washing-machine-automatic-single-tub-top-load-12kg-hwm-120-316s6.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $newImg.Dispose()
      