# Test Suite: Dark Mode and Exam Countdown Widget
Write-Host "=== TEST SUITE: Dark Mode & Exam Countdown Widget ===" -ForegroundColor Cyan

$passed = 0
$total = 0

function Assert-Condition($condition, $testName) {
  $global:total = $global:total + 1
  if ($condition) {
    $global:passed = $global:passed + 1
    Write-Host "  [PASS] $testName" -ForegroundColor Green
  } else {
    Write-Host "  [FAIL] $testName" -ForegroundColor Red
  }
}

$html = Get-Content ".\index.html" -Raw -Encoding UTF8
$css = Get-Content ".\css\style.css" -Raw -Encoding UTF8
$appJs = Get-Content ".\js\app.js" -Raw -Encoding UTF8
$dataJs = Get-Content ".\js\data.js" -Raw -Encoding UTF8
$i18nJs = Get-Content ".\js\i18n.js" -Raw -Encoding UTF8

# Test 1: Dark Mode Button and CSS variables exist
Assert-Condition ($html -match 'id="btn-theme-toggle"') "5.1 Nut chuyen doi Dark Mode co mat tren Site Header"
Assert-Condition ($css -match '\[data-theme="dark"\]') "5.2 Bo mau Dark Mode CSS [data-theme='dark'] day du va hoan chinh"

# Test 2: Exam Countdown HTML and CSS
Assert-Condition ($html -match 'id="exam-countdown-card"') "5.3 Widget dem nguoc ky thi co mat tai Tab Trang chu"
Assert-Condition ($html -match 'id="countdown-days"' -and $html -match 'id="countdown-hours"') "5.4 Day du 2 khoi dem thoi gian thuc: Ngay va Gio"

# Test 3: Admin Modal for Customizing Countdown
Assert-Condition ($html -match 'id="modal-countdown-config"') "5.5 Modal cau hinh dem nguoc danh rieng cho Admin co mat"

# Test 4: DAL & Controller logic
Assert-Condition ($dataJs -match 'getCountdownSettings' -and $dataJs -match 'saveCountdownSettings') "5.6 DAL GeoDataManager ho tro luu va doc countdown_settings"
Assert-Condition ($appJs -match 'initTheme' -and $appJs -match 'toggleTheme' -and $appJs -match 'initExamCountdown') "5.7 Controller trong app.js xu ly chuyen theme va dem nguoc thoi gian thuc"

Write-Host "`nKet qua UI Features Tests: $passed / $total Passed" -ForegroundColor Yellow
if ($passed -ne $total) { exit 1 }
