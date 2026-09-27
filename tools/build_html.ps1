# BUILD SCRIPT: Ráp các partials trong src/partials/ thành index.html
$partialsDir = Join-Path $PSScriptRoot "..\src\partials"
$outputFile = Join-Path $PSScriptRoot "..\index.html"

$files = Get-ChildItem -Path $partialsDir -Filter "*.html" | Sort-Object Name

Write-Host "Building index.html from partials:"
$parts = foreach ($f in $files) {
    Write-Host "  + $($f.Name)"
    Get-Content $f.FullName -Raw -Encoding UTF8
}

$assembled = $parts -join "`n"
[System.IO.File]::WriteAllText($outputFile, $assembled, [System.Text.Encoding]::UTF8)

$lineCount = ($assembled -split "`n").Count
Write-Host "Successfully assembled $($files.Count) partials into index.html ($lineCount lines)." -ForegroundColor Green
