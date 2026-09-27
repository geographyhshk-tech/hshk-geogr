# =================================================================
# UNIT TEST: BLACKLIST & EMAIL BLOCKING / PURGE SECURITY
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

Write-Host "=== TEST SUITE: Blacklist & Email Blocking Security ===" -ForegroundColor Cyan

$passed = 0
$total = 0

$dataJs = Get-Content ".\js\data.js" -Raw -Encoding UTF8
$authJs = Get-Content ".\js\auth.js" -Raw -Encoding UTF8
$appJs = Get-Content ".\js\app.js" -Raw -Encoding UTF8
$html = Get-Content ".\index.html" -Raw -Encoding UTF8
$rules = Get-Content ".\firestore.rules" -Raw -Encoding UTF8

# --- Test 1: Khai bao BLOCKED_EMAILS trong DAL & Rules ---
$total++
$hasCollection = ($dataJs -match 'BLOCKED_EMAILS:\s*"blocked_emails"' -and $rules -match 'match /blocked_emails/\{blockId\}')
if (Assert-True $hasCollection "6.1 Khai bao collection blocked_emails trong Data Layer va Firestore Rules") { $passed++ }

# --- Test 2: DAL co day du cac ham blockEmail, unblockEmail, isEmailBlocked ---
$total++
$hasDalMethods = ($dataJs -match 'isEmailBlocked' -and $dataJs -match 'blockEmail' -and $dataJs -match 'unblockEmail' -and $dataJs -match 'COLLECTIONS\.USERS.*delete')
if (Assert-True $hasDalMethods "6.2 DAL ho tro blockEmail (kem xoa tai khoan lap tuc), unblockEmail va isEmailBlocked") { $passed++ }

# --- Test 3: Chặn đăng nhập khi email nằm trong Blacklist ---
$total++
$hasLoginBlock = ($authJs -match 'isEmailBlocked\(emailLower\)' -and $authJs -match 'Blacklist')
if (Assert-True $hasLoginBlock "6.3 Chan dang nhap mat khau doi voi email bi chan (Blacklist)") { $passed++ }

# --- Test 4: Chặn đăng nhập Google khi email nằm trong Blacklist ---
$total++
$hasGoogleBlock = ($authJs -match 'isEmailBlocked\(email\)' -and $authJs -match 'Blacklist')
if (Assert-True $hasGoogleBlock "6.4 Chan dang nhap Google OAuth doi voi email bi chan") { $passed++ }

# --- Test 5: Chặn đăng ký tài khoản mới khi email nằm trong Blacklist ---
$total++
$hasRegisterBlock = ($authJs -match 'isEmailBlocked\(emailLower\)' -and $authJs -match 'Blacklist')
if (Assert-True $hasRegisterBlock "6.5 Chan dang ky tai khoan moi doi voi email da bi dua vao Blacklist") { $passed++ }

# --- Test 6: Giao dien Admin Panel co day du bang Blacklist va Form chan thu cong ---
$total++
$hasAdminUI = ($html -match 'admin-blocked-emails-table-body' -and $html -match 'form-admin-manual-block' -and $appJs -match 'renderAdminBlockedEmailsList')
if (Assert-True $hasAdminUI "6.6 Giao dien Admin Panel co day du Bang Blacklist va Form chan thu cong") { $passed++ }

# --- Test 7: Co nut Chan Email truc tiep tai bang nguoi dung va ham handleBlockAndPurgeUser ---
$total++
$hasActionButtons = ($appJs -match 'handleBlockAndPurgeUser' -and $appJs -match 'handleManualBlockEmail' -and $appJs -match 'handleUnblockEmail')
if (Assert-True $hasActionButtons "6.7 Controller xu ly chan email, bo chan va xoa tai khoan lap tuc") { $passed++ }

Write-Host "`nKet qua Blacklist Security Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
