# =================================================================
# TEST: PERMANENT DELETION INTEGRITY
# Verifies that deleted documents & posts cannot be resurrected by Firestore snapshots
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

Write-Host "=== TEST SUITE: Permanent Deletion & Anti-Resurrection ====" -ForegroundColor Cyan

$passed = 0
$total = 0

$dataJs = Get-Content (Join-Path $PSScriptRoot "..\js\data.js") -Raw -Encoding UTF8

# 1. Test tombstone keys exist
$total++
$hasKeys = $dataJs.Contains("DELETED_DOC_IDS: ""geo_edu_deleted_doc_ids""") -and
           $dataJs.Contains("DELETED_POST_IDS: ""geo_edu_deleted_post_ids""")
if (Assert-True $hasKeys "1.1 Khai bao STORAGE_KEYS cho tap id tai lieu va bai viet da xoa") { $passed++ }

# 2. Test constructor initializes tombstone sets
$total++
$hasSets = $dataJs.Contains("this._deletedDocIds = this._loadDeletedDocIds()") -and
           $dataJs.Contains("this._deletedPostIds = this._loadDeletedPostIds()")
if (Assert-True $hasSets "1.2 Constructor khoi tao _deletedDocIds va _deletedPostIds truoc khi nap cache") { $passed++ }

# 3. Test _loadCachedDocuments filters out deleted doc IDs
$total++
$hasFilterDocs = $dataJs.Contains("parsed.filter(d => !this._deletedDocIds.has(d.id))") -and
                 $dataJs.Contains("DEFAULT_DOCUMENTS.filter(d => !this._deletedDocIds.has(d.id))")
if (Assert-True $hasFilterDocs "1.3 _loadCachedDocuments loai bo vinh vien cac tai lieu trong _deletedDocIds") { $passed++ }

# 4. Test Firestore onSnapshot listener filters out deleted doc IDs
$total++
$hasSnapshotFilter = $dataJs.Contains("!this._deletedDocIds.has(doc.id)") -and
                     $dataJs.Contains("!this._deletedPostIds.has(doc.id)")
if (Assert-True $hasSnapshotFilter "1.4 Firestore onSnapshot bo qua cac phan tu da bi xoa, khong hoi sinh du lieu") { $passed++ }

# 5. Test deleteDocument adds to tombstone set and cleans up savedDocs
$total++
$hasDeleteLogic = $dataJs.Contains("this._deletedDocIds.add(id)") -and
                  $dataJs.Contains("this._cache.savedDocs[emailKey].filter(did => did !== id)")
if (Assert-True $hasDeleteLogic "1.5 deleteDocument luu id vao tombstone va go khoi danh sach bookmark cua user") { $passed++ }

# 6. Test deleteHshkPost and deleteGroupPost add to tombstone set
$total++
$hasDeletePostLogic = $dataJs.Contains("this._deletedPostIds.add(id)")
if (Assert-True $hasDeletePostLogic "1.6 deleteHshkPost va deleteGroupPost ghi nhan vao tap hop da xoa") { $passed++ }

# 7. Test saveDocument cleans up tombstone if re-created
$total++
$hasRecreateCleanup = $dataJs.Contains("this._deletedDocIds.delete(doc.id)") -and
                      $dataJs.Contains("this._deletedPostIds.delete(post.id)")
if (Assert-True $hasRecreateCleanup "1.7 Khi tao lai bai/tai lieu voi ID cu, he thong go khoi danh sach tombstone") { $passed++ }

Write-Host "`nKet qua Permanent Deletion Tests: $passed / $total Passed`n" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
