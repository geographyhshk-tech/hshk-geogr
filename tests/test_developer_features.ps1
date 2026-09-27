# =================================================================
# UNIT & INTEGRATION TEST: DEVELOPER CONTROLS & 2D DINO RUNNER
# Du an: Geography Edu - High School Help Kit
# =================================================================

$ErrorActionPreference = "Stop"

function Assert-Condition($condition, $testName) {
    $global:total = $global:total + 1
    if ($condition) {
        $global:passed = $global:passed + 1
        Write-Host "  [PASS] $testName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [FAIL] $testName" -ForegroundColor Red
        return $false
    }
}

Write-Host "=== TEST SUITE: Developer Controls & 2D Dino Mini-Game ===" -ForegroundColor Cyan

$passed = 0
$total = 0

$html = Get-Content ".\index.html" -Raw -Encoding UTF8
$css = Get-Content ".\css\style.css" -Raw -Encoding UTF8
$appJs = Get-Content ".\js\app.js" -Raw -Encoding UTF8
$dataJs = Get-Content ".\js\data.js" -Raw -Encoding UTF8
$authJs = Get-Content ".\js\auth.js" -Raw -Encoding UTF8
$aiJs = Get-Content ".\js\ai-chat.js" -Raw -Encoding UTF8
$dinoJs = Get-Content ".\js\dino-game.js" -Raw -Encoding UTF8
$swJs = Get-Content ".\sw.js" -Raw -Encoding UTF8

# Test 1: DAL Developer Settings Support
Assert-Condition ($dataJs -match 'developerSettings' -and $dataJs -match 'isGoogleLoginDisabled' -and $dataJs -match 'isAiDisabled' -and $dataJs -match 'setGoogleLoginDisabled' -and $dataJs -match 'setAiDisabled') "7.1 DAL GeoDataManager ho tro day du API Developer Settings (Google login va AI mode)"

# Test 2: Auth Security & Google Login Rejection
Assert-Condition ($authJs -match 'isDeveloper' -and $authJs -match 'isGoogleLoginDisabled' -and $authJs -match 'loginWithGoogle') "7.2 Auth layer kiem tra chan dang nhap Google va bao loi khi che do tu choi Google duoc bat"

# Test 3: AI Maintenance Screen & Full Website Maintenance Dino Game Button
Assert-Condition ($aiJs -match 'isAiDisabled' -and $aiJs -match 'Hien AI Dang Bao Tri' -and $html -match 'id="btn-maint-dino-game"' -and $html -match 'openDinoGameModal') "7.3 AI layer hien thi thong bao bao tri AI, va man hinh bao tri Website co nut Trai nghiem Dino Game"

# Test 4: 2D Dinosaur Mini-Game Engine
Assert-Condition ($dinoJs -match 'DinoGameEngine' -and $dinoJs -match 'DinoAudio' -and $dinoJs -match 'openDinoGameModal' -and $dinoJs -match 'restartDinoGame') "7.4 Module 2D Dino Runner Game (Canvas, Audio synth, Controls) hoan chinh trong js/dino-game.js"

# Test 5: HTML UI & Modal Elements
Assert-Condition ($html -match 'id="developer-admin-card"' -and $html -match 'id="toggle-dev-google-login"' -and $html -match 'id="toggle-dev-ai-mode"' -and $html -match 'id="modal-dino-game"' -and $html -match 'id="dino-game-canvas"') "7.5 Giao dien Admin va Modal Dino Game day du tren index.html"

# Test 6: CSS & Service Worker Cache
Assert-Condition ($css -match '\.dino-modal-card' -and $css -match '\.switch-toggle' -and $swJs -match 'dino-game\.js') "7.6 CSS switches, Dino game modal va SW Cache hop le"

# Test 7: Zero Emoji Policy on js/dino-game.js
$emojiRegex = '[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]'
$hasEmoji = [regex]::IsMatch($dinoJs, $emojiRegex)
Assert-Condition (-not $hasEmoji) "7.7 js/dino-game.js tuan thu 100% Zero Emoji policy"

Write-Host "`nKet qua Developer Features Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -ne $total) { exit 1 }
