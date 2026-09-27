# =================================================================
# TEST SUITE: Online Exam & Survey System (Khảo Sát & Kiểm Tra Trực Tuyến)
# Du an: Geography Edu - High School Help Kit
# =================================================================

Write-Host "=== TEST SUITE: Online Exam & Survey System ===" -ForegroundColor Cyan

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

$rules = Get-Content ".\firestore.rules" -Raw -Encoding UTF8
$dataJs = Get-Content ".\js\data.js" -Raw -Encoding UTF8
$appJs = Get-Content ".\js\app.js" -Raw -Encoding UTF8
$html = Get-Content ".\index.html" -Raw -Encoding UTF8

# -----------------------------------------------------------------
# 1. Firestore Security Rules Tests
# -----------------------------------------------------------------
Assert-Condition ($rules -match 'match /exams/\{examId\}' -and $rules -match 'allow read: if true;' -and $rules -match 'allow create: if isAdmin\(\)') `
  "8.1 Firestore Rules co quy dinh match /exams/{examId} cho phep doc cong khai va tao boi Admin"

Assert-Condition ($rules -match 'match /exam_submissions/\{subId\}' -and $rules -match 'allow create:' -and $rules -match 'allow read: if isAdmin\(\);' -and $rules -match 'allow delete: if isAdmin\(\);') `
  "8.2 Firestore Rules co quy dinh match /exam_submissions/{subId} cho phep thi sinh nop bai va Admin quan ly"

# -----------------------------------------------------------------
# 2. Data Layer Resilience & Fallback Tests
# -----------------------------------------------------------------
Assert-Condition ($dataJs -match 'const DEFAULT_EXAMS =' -and $dataJs -match 'GEO10-TEST' -and $dataJs -match 'GEO-KHAOSAT') `
  "8.3 Mang DEFAULT_EXAMS co day du de mau va phieu khao sat chuan"

Assert-Condition ($dataJs -match 'STORAGE_KEYS\.EXAMS' -and $dataJs -match 'STORAGE_KEYS\.EXAM_SUBMISSIONS') `
  "8.4 Storage keys cho exams va submissions ho tro offline caching"

Assert-Condition ($dataJs -match '_loadCachedExams' -and $dataJs -match '_loadCachedExamSubmissions') `
  "8.5 DAL ho tro nap san du lieu bo nho dem tu LocalStorage"

Assert-Condition ($dataJs -match 'getExamByCode\(code\)' -and $dataJs -match 'DEFAULT_EXAMS\.find') `
  "8.6 DAL getExamByCode co fallback DEFAULT_EXAMS tranh loi ma khong ton tai khi offline"

Assert-Condition ($dataJs -match 'submitExam\(submissionData\)' -and $dataJs -match 'deleteExamSubmission\(subId\)') `
  "8.7 DAL submitExam luu cache an toan va co method deleteExamSubmission"

# -----------------------------------------------------------------
# 3. Controller Logic & Anti-Cheat Fixes
# -----------------------------------------------------------------
Assert-Condition ($appJs -match 'kioskSuppressBlurViolation' -and $appJs -match 'onKioskWindowBlur') `
  "8.8 Anti-Cheat Kiosk Lock co co che chan false blur violation khi hop thoai xac nhan mo"

Assert-Condition (-not ($appJs -match 'modal-exam-admin.*classList\.contains\("open"\)')) `
  "8.9 Da sua loi kiem tra class show cho modal-exam-admin thay vi class open"

Assert-Condition ($appJs -match 'handleGuestExamSubmit' -and $appJs -match 'pendingExamForGuest') `
  "8.10 Controller ho tro luong thi sinh/khao sat nhanh cho hoc sinh chua dang nhap"

Assert-Condition ($appJs -match 'deleteExamSubmissionAdmin' -and $appJs -match 'quickFillExamCode') `
  "8.11 Controller co ham xoa bai nop Admin va ham dien nhanh ma de thi"

# -----------------------------------------------------------------
# 4. User Interface Integration Tests
# -----------------------------------------------------------------
Assert-Condition ($html -notmatch 'class="exam-hub-quick-chips"' -and $html -notmatch 'GEO10-TEST \(Khảo Sát Địa Lí 10\)') `
  "8.12 Giao dien Exam Hub da loai bo chip ma de goi y theo yeu cau"

Assert-Condition ($html -match 'id="modal-guest-exam-entry"') `
  "8.13 Giao dien co Modal nhap thong tin thi sinh khao sat nhanh"

Assert-Condition ($html -match 'id="exam-admin-card"' -and $html -match 'openAdminExamManager\(\)') `
  "8.14 Admin Panel co Card quan tri rieng cho Phong thi & Khao sat truc tuyen"

Write-Host "`nKet qua Exam System Tests: $passed / $total Passed" -ForegroundColor Yellow
if ($passed -ne $total) { exit 1 }
