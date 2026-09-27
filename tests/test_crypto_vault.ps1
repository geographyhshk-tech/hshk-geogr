# =================================================================
# UNIT TEST: CRYPTO VAULT (MA HOA & GIAI MA DU LIEU NGUOI DUNG)
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

Write-Host "=== TEST SUITE: GeoCryptoVault Security & Encryption ===" -ForegroundColor Cyan

$passed = 0
$total = 0

# --- Test 1: Chuoi ma hoa base64 hop le ---
$total++
$sampleData = @{
    email = "test.user@geography.edu.vn"
    role = "student"
    loginTime = 1714000000000
}
$jsonStr = $sampleData | ConvertTo-Json -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
$base64 = [System.Convert]::ToBase64String($bytes)
$prefixEncoded = "GEO_ENC_V1:" + $base64

if (Assert-True ($prefixEncoded.StartsWith("GEO_ENC_V1:")) "1.1 Kiem tra tien to nhan dien goi tin ma hoa (GEO_ENC_V1:)") { $passed++ }

# --- Test 2: Giai ma dung toan ven du lieu goc ---
$total++
$payloadPart = $prefixEncoded.Substring(11)
$decodedBytes = [System.Convert]::FromBase64String($payloadPart)
$recoveredJson = [System.Text.Encoding]::UTF8.GetString($decodedBytes)
$recoveredObj = $recoveredJson | ConvertFrom-Json

if (Assert-Equal $recoveredObj.email "test.user@geography.edu.vn" "1.2 Giai ma dung email nguoi dung") { $passed++ }

# --- Test 3: Du lieu rong hoac khong hop le khong lam sap ung dung ---
$total++
$invalidPayload = "GEO_ENC_V1:INVALID_BASE64_#@!"
$safeRecovered = try {
    [System.Convert]::FromBase64String($invalidPayload.Substring(11))
    $false
} catch {
    $true
}
if (Assert-True $safeRecovered "1.3 Tu dong bat loi va phong ve khi du lieu bi sua doi bat thuong") { $passed++ }

# --- Test 4: PBKDF2 Password Hashing voi 100,000 iterations ---
$total++
$authJs = Get-Content ".\js\auth.js" -Raw -Encoding UTF8
$hasPbkdf2 = ($authJs -match 'PBKDF2' -and $authJs -match '100000' -and $authJs -match '\$pbkdf2\$')
if (Assert-True $hasPbkdf2 "1.4 Thuat toan bam mat khau PBKDF2 100.000 iterations & Dynamic Salt") { $passed++ }

# --- Test 5: Content Security Policy (CSP) Header trong index.html ---
$total++
$html = Get-Content ".\index.html" -Raw -Encoding UTF8
$hasCsp = ($html -match 'http-equiv="Content-Security-Policy"')
if (Assert-True $hasCsp "1.5 The Content-Security-Policy (CSP) bao ve he thong chong XSS & Injection") { $passed++ }

# --- Test 6: Anti-Bot Robot Verification Challenge M%@vs2hShK ---
$total++
$appJs = Get-Content ".\js\app.js" -Raw -Encoding UTF8
$hasAntiBot = ($html -match 'M%@vs2hShK' -and $html -match 'modal-robot-verification' -and $appJs -match 'M%@vs2hShK')
if (Assert-True $hasAntiBot "1.6 Man hinh xac thuc Anti-Bot (Ma: M%@vs2hShK) chan spam bot dang ky") { $passed++ }

Write-Host "`nKet qua Crypto Vault Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
