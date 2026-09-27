$testUser = @{
    id = "usr-test-student-001"
    name = "Hoc Sinh Test API"
    email = "test.student001@gmail.com"
    role = "user"
    userType = "Học sinh THCS"
    createdAt = "18/09/2026"
}
$jsonPayload = $testUser | ConvertTo-Json

Write-Host "1. Testing POST /api/users..."
$postRes = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method Post -Body $jsonPayload -ContentType "application/json; charset=utf-8"
Write-Host "POST Result:" ($postRes | ConvertTo-Json -Compress)

Write-Host "`n2. Testing GET /api/users..."
$getRes = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method Get
Write-Host "Total users from GET /api/users:" $getRes.Count
$found = $getRes | Where-Object { $_.email -eq "test.student001@gmail.com" }
if ($found) {
    Write-Host "Found created user in backend store: $($found.name) ($($found.email))" -ForegroundColor Green
} else {
    Write-Host "ERROR: User not found in backend store!" -ForegroundColor Red
}
