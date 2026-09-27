$endpoints = @(
    "http://localhost:8080/",
    "http://localhost:8080/index.html",
    "http://localhost:8080/css/style.css",
    "http://localhost:8080/js/data.js",
    "http://localhost:8080/js/auth.js",
    "http://localhost:8080/js/app.js"
)

foreach ($url in $endpoints) {
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing
        Write-Host "✅ [SUCCESS] $url - Status: $($res.StatusCode), Content length: $($res.Content.Length) bytes"
    } catch {
        Write-Host "❌ [FAILED] $url - $($_.Exception.Message)"
    }
}
