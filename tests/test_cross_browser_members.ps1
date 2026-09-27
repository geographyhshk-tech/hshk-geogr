$port = 3000
$testEmail = "hocsinh_cross_" + (Get-Date -Format "yyyyMMddHHmmss") + "@gmail.com"
$testPass = "MatKhau123!"
$testName = "Nguyen Van CrossSession"

$logPath = Join-Path $PSScriptRoot "..\test_cross_out.txt"
Remove-Item $logPath -ErrorAction SilentlyContinue

# Phase 1: Registration in Profile A
$html1 = @"
<!DOCTYPE html>
<html>
<body>
<pre id="out">PHASE 1: REGISTERING IN BROWSER A...</pre>
<script>
function log(msg) {
  fetch('/api/test/log', { method: 'POST', body: 'PROFILE_A: ' + msg }).catch(() => {});
}

async function start() {
  try {
    const iframe = document.createElement("iframe");
    iframe.src = "index.html";
    iframe.style.width = "1280px";
    iframe.style.height = "800px";
    await new Promise(res => { iframe.onload = res; document.body.appendChild(iframe); });
    await new Promise(r => setTimeout(r, 1000));

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;

    log("Registering $testEmail");
    win.switchAuthGateTab("register");
    await new Promise(r => setTimeout(r, 300));

    doc.getElementById("gate-reg-fullname").value = "$testName";
    doc.getElementById("gate-reg-email").value = "$testEmail";
    doc.getElementById("gate-reg-password").value = "$testPass";

    doc.getElementById("btn-gate-register-submit").click();
    await new Promise(r => setTimeout(r, 400));

    doc.getElementById("btn-robot-answer-no").click();

    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 800));
      if (win.geoAuth && win.geoAuth.isAuthenticated()) {
        log("Registration successful: " + win.geoAuth.currentUser.email);
        break;
      }
    }
    log("PROFILE_A_DONE");
  } catch(e) {
    log("ERR: " + e.message);
  }
}
window.addEventListener("load", start);
</script>
</body>
</html>
"@

$runner1 = Join-Path $PSScriptRoot "..\test_runner_cross1.html"
[System.IO.File]::WriteAllText($runner1, $html1, [System.Text.Encoding]::UTF8)

$profileA = Join-Path $PSScriptRoot ("..\tmp_edge_profA_" + (Get-Random))
$edgeA = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--remote-debugging-port=9235", "--user-data-dir=$profileA", "http://localhost:$port/test_runner_cross1.html" -PassThru
Start-Sleep -Seconds 15
Stop-Process -Id $edgeA.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profileA -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runner1 -Force -ErrorAction SilentlyContinue

# Phase 2: Open COMPLETELY SEPARATE Browser Profile B (Clean, no localStorage from Profile A)
$html2 = @"
<!DOCTYPE html>
<html>
<body>
<pre id="out">PHASE 2: CHECKING ADMIN IN BROWSER B (CLEAN PROFILE)...</pre>
<script>
function log(msg) {
  fetch('/api/test/log', { method: 'POST', body: 'PROFILE_B: ' + msg }).catch(() => {});
}

async function start() {
  try {
    const iframe = document.createElement("iframe");
    iframe.src = "index.html";
    iframe.style.width = "1280px";
    iframe.style.height = "800px";
    await new Promise(res => { iframe.onload = res; document.body.appendChild(iframe); });
    await new Promise(r => setTimeout(r, 1200));

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;

    log("Browser B opened - setting Admin session");
    const adminUser = {
      id: "usr-admin-hshk",
      name: "Ban Dieu Hanh HSHK",
      email: "hshk.project@gmail.com",
      role: "admin",
      userType: "Admin"
    };
    win.geoAuth.setCurrentUser(adminUser);
    win.updateAuthUI();

    log("Switching to Admin Panel tab");
    win.switchTab("admin-panel");
    await new Promise(r => setTimeout(r, 1500));

    // Also trigger fetchRemoteUsers explicitly to simulate live background sync
    await win.geoAuth.fetchRemoteUsers();
    win.renderAdminDashboard();

    const allUsers = win.geoAuth.getAllUsers();
    log("Profile B total allUsers count: " + allUsers.length);
    const foundUser = allUsers.find(u => u.email && u.email.toLowerCase() === "$testEmail".toLowerCase());
    log("Found in Profile B getAllUsers? " + (foundUser ? "YES" : "NO"));

    const tableBody = doc.getElementById("admin-users-table-body");
    const tableText = tableBody ? tableBody.innerText : "";
    const foundInTable = tableText.includes("$testEmail") || tableText.includes("$testName");
    log("Found in Profile B Admin table HTML? " + (foundInTable ? "YES" : "NO"));

    if (foundUser && foundInTable) {
      log("SUCCESS: CROSS_BROWSER_PERSISTENCE_CONFIRMED");
    } else {
      log("FAIL: User registered in Profile A missing from Profile B!");
    }
  } catch(e) {
    log("ERR: " + e.message);
  }
}
window.addEventListener("load", start);
</script>
</body>
</html>
"@

$runner2 = Join-Path $PSScriptRoot "..\test_runner_cross2.html"
[System.IO.File]::WriteAllText($runner2, $html2, [System.Text.Encoding]::UTF8)

$profileB = Join-Path $PSScriptRoot ("..\tmp_edge_profB_" + (Get-Random))
$edgeB = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--remote-debugging-port=9236", "--user-data-dir=$profileB", "http://localhost:$port/test_runner_cross2.html" -PassThru
Start-Sleep -Seconds 15
Stop-Process -Id $edgeB.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profileB -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runner2 -Force -ErrorAction SilentlyContinue

$logFile = Join-Path $PSScriptRoot "..\test_page_out.txt"
if (Test-Path $logFile) {
    Get-Content $logFile
    Remove-Item $logFile -Force -ErrorAction SilentlyContinue
}
