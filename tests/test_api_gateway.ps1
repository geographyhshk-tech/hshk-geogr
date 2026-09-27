# =================================================================
# INTEGRATION / E2E TEST: BACKEND API GATEWAY ENDPOINTS
# Du an: Geography Edu - High School Help Kit
# =================================================================

$ErrorActionPreference = "Stop"

function Assert-Equal($actual, $expected, $testName) {
    if ($actual -eq $expected) {
        Write-Host "  [PASS] $testName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [FAIL] $testName - Expected '$expected', got '$actual'" -ForegroundColor Red
        return $false
    }
}

function Assert-True($condition, $testName) {
    if ($condition) {
        Write-Host "  [PASS] $testName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [FAIL] $testName" -ForegroundColor Red
        return $false
    }
}

Write-Host "=== TEST SUITE: Backend API Gateway & Proxy Routes ===" -ForegroundColor Cyan

$passed = 0
$total = 0

# Doc file server.ps1 va server.js
$serverPs1 = Get-Content (Join-Path $PSScriptRoot "..\server.ps1") -Raw
$serverJs = Get-Content (Join-Path $PSScriptRoot "..\server.js") -Raw

# --- Test 1: Kiem tra su ton tai cua endpoint /api/health ---
$total++
$hasHealthPs1 = $serverPs1.Contains("/api/health")
$hasHealthJs = $serverJs.Contains("/api/health")
if (Assert-True ($hasHealthPs1 -and $hasHealthJs) "4.1 Endpoint /api/health duoc ho tro tren ca PS1 va JS server") { $passed++ }

# --- Test 2: Kiem tra su ton tai cua endpoint /api/ai/chat ---
$total++
$hasChatPs1 = $serverPs1.Contains("/api/ai/chat")
$hasChatJs = $serverJs.Contains("/api/ai/chat")
if (Assert-True ($hasChatPs1 -and $hasChatJs) "4.2 Endpoint /api/ai/chat duoc ho tro tren ca PS1 va JS server") { $passed++ }

# --- Test 3: Kiem tra su ton tai cua endpoint /api/ai/translate ---
$total++
$hasTranslatePs1 = $serverPs1.Contains("/api/ai/translate")
$hasTranslateJs = $serverJs.Contains("/api/ai/translate")
if (Assert-True ($hasTranslatePs1 -and $hasTranslateJs) "4.3 Endpoint /api/ai/translate duoc ho tro tren ca PS1 va JS server") { $passed++ }

# --- Test 4: Kiem tra CORS Headers day du ---
$total++
$hasCors = $serverPs1.Contains("Access-Control-Allow-Origin") -and $serverJs.Contains("Access-Control-Allow-Origin")
if (Assert-True $hasCors "4.4 Cau hinh CORS Headers an toan cho moi phuong thuc OPTIONS/POST/GET") { $passed++ }

Write-Host "`nKet qua API Gateway Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
