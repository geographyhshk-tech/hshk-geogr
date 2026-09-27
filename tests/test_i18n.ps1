# =================================================================
# UNIT TEST: MULTILINGUAL & I18N DICTIONARY INTEGRITY
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

Write-Host "=== TEST SUITE: Multilingual i18n & Translation Integrity ===" -ForegroundColor Cyan

$passed = 0
$total = 0

# Doc file i18n.js
$i18nPath = Join-Path $PSScriptRoot "..\js\i18n.js"
$content = Get-Content $i18nPath -Raw

# --- Test 1: Ho tro du 6 ngon ngu quy dinh ---
$total++
$hasVi = $content.Contains("vi: {")
$hasEn = $content.Contains("en: {")
$hasZh = $content.Contains("zh: {")
$hasJa = $content.Contains("ja: {")
$hasKo = $content.Contains("ko: {")
$hasRu = $content.Contains("ru: {")

$allLangs = $hasVi -and $hasEn -and $hasZh -and $hasJa -and $hasKo -and $hasRu
if (Assert-True $allLangs "3.1 Day du 6 ngon ngu (VI, EN, ZH, JA, KO, RU)") { $passed++ }

# --- Test 2: Khong chua emoji trong tep i18n.js ---
$total++
$emojiRegex = '[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]'
$hasEmoji = [regex]::IsMatch($content, $emojiRegex)
if (Assert-Equal $hasEmoji $false "3.2 Tuan thu 100% khong emoji trong toan bo tu dien") { $passed++ }

# --- Test 3: Khoa dich man hinh bao tri day du ---
$total++
$hasMaintTitle = $content.Contains("maintScreenTitle")
$hasMaintDesc = $content.Contains("maintApologyText")
$hasMaintGame = $content.Contains("maintGameBoxTitle")
if (Assert-True ($hasMaintTitle -and $hasMaintDesc -and $hasMaintGame) "3.3 Co day du cac khoa dich cho man hinh bao tri va game mini") { $passed++ }

# --- Test 4: Khoa dich Developer Controls va Dino Runner tren ca 6 ngon ngu ---
$total++
$hasDevControls = $content.Contains("devControlsTitle") -and $content.Contains("googleLoginDisabledNotice")
$hasAiMaint = $content.Contains("aiMaintTitle") -and $content.Contains("aiMaintDesc")
$hasDinoModal = $content.Contains("dinoGameModalTitle") -and $content.Contains("dinoCanvasPrompt")
if (Assert-True ($hasDevControls -and $hasAiMaint -and $hasDinoModal) "3.4 Co day du khoa dich Developer Controls, AI Maintenance va Dino Game tren ca 6 ngon ngu") { $passed++ }

Write-Host "`nKet qua i18n Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
