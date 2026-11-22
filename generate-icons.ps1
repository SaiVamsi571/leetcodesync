Add-Type -AssemblyName System.Drawing

function Draw-Icon([int]$size, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [double]$size / 128.0

    # 1. Background Squircle
    $pad = 4.0 * $scale
    $radius = 26.0 * $scale
    $w = [double]$size - (2.0 * $pad)
    $h = [double]$size - (2.0 * $pad)
    $rect = [System.Drawing.RectangleF]::new([float]$pad, [float]$pad, [float]$w, [float]$h)
    
    $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = [float]($radius * 2.0)
    $bgPath.AddArc([float]$rect.X, [float]$rect.Y, $d, $d, 180, 90)
    $bgPath.AddArc([float]($rect.Right - $d), [float]$rect.Y, $d, $d, 270, 90)
    $bgPath.AddArc([float]($rect.Right - $d), [float]($rect.Bottom - $d), $d, $d, 0, 90)
    $bgPath.AddArc([float]$rect.X, [float]($rect.Bottom - $d), $d, $d, 90, 90)
    $bgPath.CloseFigure()

    # Premium dark background gradient (#161b22 to #0d1117)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.PointF]::new(0, 0),
        [System.Drawing.PointF]::new([float]$size, [float]$size),
        [System.Drawing.Color]::FromArgb(255, 30, 36, 46),
        [System.Drawing.Color]::FromArgb(255, 13, 17, 23)
    )
    $g.FillPath($bgBrush, $bgPath)
    $bgBrush.Dispose()

    # Outer border
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 48, 54, 61), [float](1.5 * $scale))
    $g.DrawPath($borderPen, $bgPath)
    $borderPen.Dispose()
    $bgPath.Dispose()

    # 2. Sync Circular Arcs (GitHub Blue / Emerald)
    $arcWidth = [float](6.0 * $scale)
    if ($size -le 16) { $arcWidth = 1.8 }
    $arcPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 88, 166, 255), $arcWidth)
    $arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arcPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    
    $arcBox = [System.Drawing.RectangleF]::new([float](22.0 * $scale), [float](22.0 * $scale), [float](84.0 * $scale), [float](84.0 * $scale))
    # Top arc
    $g.DrawArc($arcPen, $arcBox, 200, 130)
    # Bottom arc
    $g.DrawArc($arcPen, $arcBox, 20, 130)
    $arcPen.Dispose()

    # Arrowheads for sync arcs
    if ($size -gt 16) {
        $headBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 88, 166, 255))
        # Top-right arrowhead
        $p1 = [System.Drawing.PointF]::new([float](96 * $scale), [float](30 * $scale))
        $p2 = [System.Drawing.PointF]::new([float](108 * $scale), [float](42 * $scale))
        $p3 = [System.Drawing.PointF]::new([float](94 * $scale), [float](48 * $scale))
        $g.FillPolygon($headBrush, @($p1, $p2, $p3))

        # Bottom-left arrowhead
        $p4 = [System.Drawing.PointF]::new([float](32 * $scale), [float](98 * $scale))
        $p5 = [System.Drawing.PointF]::new([float](20 * $scale), [float](86 * $scale))
        $p6 = [System.Drawing.PointF]::new([float](34 * $scale), [float](80 * $scale))
        $g.FillPolygon($headBrush, @($p4, $p5, $p6))
        $headBrush.Dispose()
    }

    # 3. Center LeetCode Lightning Bolt in Vibrant Gold/Orange (#FFA116)
    $boltPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pts = @(
        [System.Drawing.PointF]::new([float](67 * $scale), [float](32 * $scale)),
        [System.Drawing.PointF]::new([float](47 * $scale), [float](65 * $scale)),
        [System.Drawing.PointF]::new([float](62 * $scale), [float](65 * $scale)),
        [System.Drawing.PointF]::new([float](58 * $scale), [float](96 * $scale)),
        [System.Drawing.PointF]::new([float](83 * $scale), [float](61 * $scale)),
        [System.Drawing.PointF]::new([float](68 * $scale), [float](61 * $scale))
    )
    $boltPath.AddPolygon($pts)

    $boltBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.PointF]::new([float](50 * $scale), [float](32 * $scale)),
        [System.Drawing.PointF]::new([float](70 * $scale), [float](96 * $scale)),
        [System.Drawing.Color]::FromArgb(255, 255, 184, 0),  # #FFB800
        [System.Drawing.Color]::FromArgb(255, 255, 140, 0)   # #FF8C00
    )
    $g.FillPath($boltBrush, $boltPath)
    $boltBrush.Dispose()
    $boltPath.Dispose()

    # 4. Small Green "Synced" Dot (for sizes >= 32)
    if ($size -ge 32) {
        $dotSize = [float](18 * $scale)
        $dotX = [float]($size - $pad - $dotSize - (2 * $scale))
        $dotY = [float]($size - $pad - $dotSize - (2 * $scale))
        
        $dotBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 13, 17, 23), [float](2.2 * $scale))
        $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 63, 185, 80)) # GitHub Green #3FB950
        
        $g.FillEllipse($dotBrush, $dotX, $dotY, $dotSize, $dotSize)
        $g.DrawEllipse($dotBorder, $dotX, $dotY, $dotSize, $dotSize)
        
        $dotBrush.Dispose()
        $dotBorder.Dispose()
    }

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Successfully generated $path ($size x $size)"
}

Draw-Icon 128 "icons/icon128.png"
Draw-Icon 48 "icons/icon48.png"
Draw-Icon 32 "icons/icon32.png"
Draw-Icon 16 "icons/icon16.png"
