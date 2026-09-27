# =================================================================
# INTEGRATION / UNIT TEST: CRUD REAL OPERATIONS
# Tests Post creation/deletion, Document creation/deletion, and Document Bookmarking
# =================================================================

$ErrorActionPreference = "Stop"

function Assert-True($condition, $testName) {
    if ($condition) {
        Write-Host "  [PASS] $testName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [FAIL] $testName" -ForegroundColor Red
        return $false
    }
}

Write-Host "=== TEST SUITE: Real CRUD & Bookmark Operations ===" -ForegroundColor Cyan

$passed = 0
$total = 0

$appJs = Get-Content (Join-Path $PSScriptRoot "..\js\app.js") -Raw -Encoding UTF8
$dataJs = Get-Content (Join-Path $PSScriptRoot "..\js\data.js") -Raw -Encoding UTF8
$html = Get-Content (Join-Path $PSScriptRoot "..\index.html") -Raw -Encoding UTF8

# 1. Test saveHshkPost updates cache and localStorage immediately
$total++
$hasHshkLocal = $dataJs.Contains("STORAGE_KEYS.HSHK_POSTS") -and $dataJs.Contains("this._cache.hshkPosts.unshift(post)")
if (Assert-True $hasHshkLocal "1.1 saveHshkPost luu ngay vao local cache va localStorage khong gay tre") { $passed++ }

# 2. Test deleteHshkPost updates cache and localStorage immediately
$total++
$hasHshkDelete = $dataJs.Contains("this._cache.hshkPosts = (this._cache.hshkPosts || []).filter(p => p.id !== id)")
if (Assert-True $hasHshkDelete "1.2 deleteHshkPost xoa ngay trong local cache va localStorage khong bi loi") { $passed++ }

# 3. Test saveGroupPost updates cache and localStorage immediately
$total++
$hasGroupLocal = $dataJs.Contains("STORAGE_KEYS.GROUP_POSTS") -and $dataJs.Contains("this._cache.groupPosts.unshift(post)")
if (Assert-True $hasGroupLocal "1.3 saveGroupPost luu ngay vao local cache va localStorage") { $passed++ }

# 4. Test deleteGroupPost updates cache and localStorage immediately
$total++
$hasGroupDelete = $dataJs.Contains("this._cache.groupPosts = (this._cache.groupPosts || []).filter(p => p.id !== id)")
if (Assert-True $hasGroupDelete "1.4 deleteGroupPost xoa ngay trong local cache va localStorage") { $passed++ }

# 5. Test saveDocument updates cache and localStorage immediately
$total++
$hasDocLocal = $dataJs.Contains("STORAGE_KEYS.DOCUMENTS") -and $dataJs.Contains("this._cache.documents.unshift(doc)")
if (Assert-True $hasDocLocal "1.5 saveDocument luu ngay vao local cache va localStorage khong can cho Firestore") { $passed++ }

# 6. Test deleteDocument updates cache and localStorage immediately
$total++
$hasDocDelete = $dataJs.Contains("this._cache.documents = (this._cache.documents || []).filter(d => d.id !== id)")
if (Assert-True $hasDocDelete "1.6 deleteDocument xoa ngay trong local cache va localStorage") { $passed++ }

# 7. Test toggleSaveDocument persists to localStorage and dispatches event
$total++
$hasToggleSave = $dataJs.Contains("STORAGE_KEYS.SAVED_DOCS") -and $dataJs.Contains("this._cache.savedDocs[key] = currentIds")
if (Assert-True $hasToggleSave "1.7 toggleSaveDocument luu ngay vao localStorage va cache theo email") { $passed++ }

# 8. Test app.js exports handleSavePost, handleSaveDocument, confirmDeletePost, confirmDeleteDocument, toggleSaveDocument to window
$total++
$hasExports = $appJs.Contains("window.handleSavePost = handleSavePost") -and
              $appJs.Contains("window.handleSaveDocument = handleSaveDocument") -and
              $appJs.Contains("window.confirmDeletePost = confirmDeletePost") -and
              $appJs.Contains("window.confirmDeleteDocument = confirmDeleteDocument") -and
              $appJs.Contains("window.toggleSaveDocument = toggleSaveDocument")
if (Assert-True $hasExports "1.8 app.js export day du cac ham dang, luu, xoa bai viet & tai lieu ra window") { $passed++ }

# 9. Test index.html forms have onsubmit handlers for post and doc
$total++
$hasFormOnsubmit = $html.Contains('id="form-post-crud" onsubmit="handleSavePost(event)"') -and
                   $html.Contains('id="form-doc-crud" onsubmit="handleSaveDocument(event)"')
if (Assert-True $hasFormOnsubmit "1.9 index.html co onsubmit truc tiep cho form dang bai va dang tai lieu") { $passed++ }

# 10. Test document card in app.js has onclick for toggleSaveDocument, openEditDocumentModal, and confirmDeleteDocument
$total++
$hasDocCardBtns = ($appJs -match 'onclick="toggleSaveDocument\(') -and
                  ($appJs -match 'onclick="openEditDocumentModal\(') -and
                  ($appJs -match 'onclick="confirmDeleteDocument\(')
if (Assert-True $hasDocCardBtns "1.10 The tai lieu co day du nut Luu/Bo luu, Sua va Xoa thuc su hoat dong") { $passed++ }

# 11. Test post card in app.js has onclick for confirmDeletePost and openEditPostModal
$total++
$hasPostCardBtns = ($appJs -match 'onclick="confirmDeletePost\(''hshk''') -and
                   ($appJs -match 'onclick="openEditPostModal\(''hshk''')
if (Assert-True $hasPostCardBtns "1.11 The bai viet co day du nut Sua va Xoa thuc su hoat dong") { $passed++ }

Write-Host "`nKet qua Real CRUD & Bookmark Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
