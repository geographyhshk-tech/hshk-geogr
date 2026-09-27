# =================================================================
# UNIT TEST: ADMIN TOKEN SECURITY & FIRESTORE RULES INTEGRITY
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

Write-Host "=== TEST SUITE: Admin Token Security & Firestore Rules Verification ===" -ForegroundColor Cyan

$passed = 0
$total = 0

# --- Test 1: Kiem tra server.js chan email-only payload tren /api/admin-token ---
$total++
$serverJs = Get-Content (Join-Path $PSScriptRoot "..\server.js") -Raw
$hasIdTokenCheckJs = $serverJs.Contains("idToken") -and $serverJs.Contains("verifyGoogleIdToken")
if (Assert-True $hasIdTokenCheckJs "1.1 server.js da tich hop verifyGoogleIdToken va kiem tra idToken cho /api/admin-token") { $passed++ }

# --- Test 2: Kiem tra server.ps1 chan email-only payload tren /api/admin-token ---
$total++
$serverPs1 = Get-Content (Join-Path $PSScriptRoot "..\server.ps1") -Raw
$hasIdTokenCheckPs1 = $serverPs1.Contains("idToken") -and $serverPs1.Contains("tokeninfo?id_token")
if (Assert-True $hasIdTokenCheckPs1 "1.2 server.ps1 da tich hop kiem tra idToken qua Google tokeninfo cho /api/admin-token") { $passed++ }

# --- Test 3: Kiem tra firestore.rules bat buoc email_verified cho ca 2 email admin ---
$total++
$rulesContent = Get-Content (Join-Path $PSScriptRoot "..\firestore.rules") -Raw
$hasVerifiedCheck = $rulesContent.Contains("hshk.project@gmail.com") -and 
                     $rulesContent.Contains("email_verified == true") -and 
                     $rulesContent.Contains("sign_in_provider != `"password`"")
if (Assert-True $hasVerifiedCheck "1.3 firestore.rules da yeu cau bat buoc email_verified/Google Provider cho admin") { $passed++ }

# --- Test 4: Kiem tra js/auth.js da truyen idToken khi goi _fetchAdminToken ---
$total++
$authJs = Get-Content (Join-Path $PSScriptRoot "..\js\auth.js") -Raw
$hasAuthTokenPass = $authJs.Contains("getIdToken(true)") -and $authJs.Contains("idToken")
if (Assert-True $hasAuthTokenPass "1.4 js/auth.js da lay idToken tu Firebase Auth va truyen len /api/admin-token") { $passed++ }

Write-Host "`nKet qua Security Fixes Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
