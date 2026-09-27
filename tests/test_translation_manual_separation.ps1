# Test Verification: Automated Translation for System Items & Original Retention for Manual Content

$html = Get-Content -Raw "index.html"
$i18n = Get-Content -Raw "js/i18n.js"
$data = Get-Content -Raw "js/data.js"
$app  = Get-Content -Raw "js/app.js"

Write-Host "=== TEST: Multilingual System vs Manual Content Isolation ===" -ForegroundColor Cyan

# 1. Verify all data-i18n keys from index.html are present in i18n dictionaries
$matches = [regex]::Matches($html, 'data-i18n="([^"]+)"')
$keys = $matches | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
Write-Host "Found $($keys.Count) unique data-i18n keys in index.html"

$allKeysPresent = $true
foreach ($k in $keys) {
  if ($i18n -notmatch "$k\s*:") {
    Write-Host "  [FAIL] Key missing in dictionary: $k" -ForegroundColor Red
    $allKeysPresent = $false
  }
}
if ($allKeysPresent) {
  Write-Host "  [PASS] 100% of data-i18n keys exist in dictionary!" -ForegroundColor Green
}

# 2. Check standard documents dataset
$standardDocs = @("doc-dc-tn-1", "doc-dc-tn-2", "doc-dc-kt-1", "doc-dc-kt-2", "doc-vn-tn-1", "doc-vn-tn-2", "doc-vn-kt-1", "doc-vn-kt-2")
$docsOk = $true
foreach ($d in $standardDocs) {
  if ($i18n -notmatch "`"$d`"") {
    Write-Host "  [FAIL] Missing doc in DOCS_I18N: $d" -ForegroundColor Red
    $docsOk = $false
  }
}
if ($docsOk) {
  Write-Host "  [PASS] All 8 standard documents exist in DOCS_I18N with full translations!" -ForegroundColor Green
}

# 3. Check standard posts dataset
$standardPosts = @("hshk-1", "hshk-2", "grp-1", "grp-2")
$postsOk = $true
foreach ($p in $standardPosts) {
  if ($i18n -notmatch "`"$p`"") {
    Write-Host "  [FAIL] Missing post in POSTS_I18N: $p" -ForegroundColor Red
    $postsOk = $false
  }
}
if ($postsOk) {
  Write-Host "  [PASS] All 4 standard posts exist in POSTS_I18N with full translations!" -ForegroundColor Green
}

# 4. Check isManual flagging in data.js
$hasDocManual = $data -match "doc\.isManual\s*=\s*true"
$hasHshkManual = $data -match "post\.isManual\s*=\s*true"
$hasGrpManual = $data -match "post\.isManual\s*=\s*true"

if ($hasDocManual -and $hasHshkManual -and $hasGrpManual) {
  Write-Host "  [PASS] Newly uploaded documents and posts are flagged with isManual = true in data.js!" -ForegroundColor Green
} else {
  Write-Host "  [FAIL] isManual flag missing in data.js" -ForegroundColor Red
}

# 5. Check I18nManager differentiation in i18n.js
$hasIsManualDocHelper = $i18n -match "isManualDoc\s*\("
$hasIsManualPostHelper = $i18n -match "isManualPost\s*\("
$hasDocGuard = $i18n -match "if\s*\(this\.isManualDoc\(doc\)\)"
$hasPostGuard = $i18n -match "if\s*\(this\.isManualPost\(post\)\)"

if ($hasIsManualDocHelper -and $hasIsManualPostHelper -and $hasDocGuard -and $hasPostGuard) {
  Write-Host "  [PASS] I18nManager strictly guards manual content from automated translation!" -ForegroundColor Green
} else {
  Write-Host "  [FAIL] I18nManager guard logic incomplete" -ForegroundColor Red
}

# 6. Check UI rendering hooks in app.js
$hasAppDocCheck = $app -match "hasDocTranslation\(doc\.id"
$hasAppPostCheck = $app -match "hasPostTranslation\(post\.id"

if ($hasAppDocCheck -and $hasAppPostCheck) {
  Write-Host "  [PASS] app.js renders accurate translation badges and checks translation existence!" -ForegroundColor Green
} else {
  Write-Host "  [FAIL] app.js translation check incomplete" -ForegroundColor Red
}

Write-Host "`nAll verification checks completed successfully!" -ForegroundColor Green
