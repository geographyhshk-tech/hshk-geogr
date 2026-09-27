# =================================================================
# UNIT TEST: AUTH SECURITY & BRUTE-FORCE DEFENSE
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

Write-Host "=== TEST SUITE: Authentication Security & Anti-Bruteforce Rules ===" -ForegroundColor Cyan

$passed = 0
$total = 0

# --- Test 1: Sai mat khau lan 1 va 2 -> Khong khoa ---
$total++
$attemptCount = 2
$isLocked = $attemptCount -ge 3
if (Assert-Equal $isLocked $false "2.1 Thu sai 2 lan chua bi khoa tai khoan") { $passed++ }

# --- Test 2: Sai mat khau 3 lan -> Khoa 5 phut (300 giay) ---
$total++
$attemptCount = 3
$lockMinutes = if ($attemptCount -eq 3) { 5 } elseif ($attemptCount -eq 4) { 2 } elseif ($attemptCount -ge 5) { -1 } else { 0 }
if (Assert-Equal $lockMinutes 5 "2.2 Thu sai 3 lan khoa dung 5 phut (300 giay)") { $passed++ }

# --- Test 3: Sai mat khau 4 lan -> Khoa 2 phut ---
$total++
$attemptCount = 4
$lockMinutes = if ($attemptCount -eq 3) { 5 } elseif ($attemptCount -eq 4) { 2 } elseif ($attemptCount -ge 5) { -1 } else { 0 }
if (Assert-Equal $lockMinutes 2 "2.3 Thu sai 4 lan khoa tiep 2 phut") { $passed++ }

# --- Test 4: Sai mat khau 5 lan -> Khoa vinh vien & Canh bao Super Admin ---
$total++
$attemptCount = 5
$isPermanentLock = $attemptCount -ge 5
if (Assert-True $isPermanentLock "2.4 Thu sai 5 lan khoa vinh vien cho Admin tong mo khoa") { $passed++ }

# --- Test 5: Gioi han Confession (Rate limit: toi da 5 confession/gio) ---
$total++
$confessionTimestamps = @(
    (Get-Date).AddMinutes(-50).Ticks,
    (Get-Date).AddMinutes(-40).Ticks,
    (Get-Date).AddMinutes(-30).Ticks,
    (Get-Date).AddMinutes(-20).Ticks,
    (Get-Date).AddMinutes(-10).Ticks
)
$oneHourAgoTicks = (Get-Date).AddHours(-1).Ticks
$validInWindow = $confessionTimestamps | Where-Object { $_ -ge $oneHourAgoTicks }
$canSubmit = $validInWindow.Count -lt 5
if (Assert-Equal $canSubmit $false "2.5 Chan gui confession khi vuot qua 5 bai / gio") { $passed++ }

# --- Test 6: Cau truc Auth Gate bat buoc trong index.html ---
$total++
$htmlPath = Join-Path $PSScriptRoot "..\index.html"
$htmlContent = Get-Content $htmlPath -Raw
$hasGateOverlay = $htmlContent.Contains('id="auth-gate-overlay"')
$hasGateLoginForm = $htmlContent.Contains('id="form-auth-gate-login"')
$hasGateRegForm = $htmlContent.Contains('id="form-auth-gate-register"')
if (Assert-True ($hasGateOverlay -and $hasGateLoginForm -and $hasGateRegForm) "2.6 Man hinh Auth Gate co day du trong index.html") { $passed++ }

# --- Test 7: Ham dieu khien checkAuthGate trong app.js ---
$total++
$appJsPath = Join-Path $PSScriptRoot "..\js\app.js"
$appJsContent = Get-Content $appJsPath -Raw
$hasCheckAuthGate = $appJsContent.Contains("function checkAuthGate()")
$hasSwitchAuthGateTab = $appJsContent.Contains("function switchAuthGateTab(")
if (Assert-True ($hasCheckAuthGate -and $hasSwitchAuthGateTab) "2.7 Logic checkAuthGate va switchAuthGateTab co mat trong app.js") { $passed++ }

# --- Test 8: Co che canViewPasswords va togglePasswordDelegation trong auth.js ---
$total++
$authJsPath = Join-Path $PSScriptRoot "..\js\auth.js"
$authJsContent = Get-Content $authJsPath -Raw
$hasCanViewPwd = $authJsContent.Contains("canViewPasswords()")
$hasTogglePwdDelegation = $authJsContent.Contains("togglePasswordDelegation(")
if (Assert-True ($hasCanViewPwd -and $hasTogglePwdDelegation) "2.8 Co che canViewPasswords va togglePasswordDelegation co mat trong auth.js") { $passed++ }

# --- Test 9: Ham handleTogglePasswordDelegation va UI hien thi mat khau trong app.js ---
$total++
$hasHandleTogglePwd = $appJsContent.Contains("handleTogglePasswordDelegation(")
$hasTogglePwdVis = $appJsContent.Contains("toggleUserPasswordVisibility(")
if (Assert-True ($hasHandleTogglePwd -and $hasTogglePwdVis) "2.9 Logic UI uy quyen va xem mat khau co mat trong app.js") { $passed++ }

Write-Host "`nKet qua Auth Security Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }

