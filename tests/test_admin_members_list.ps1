$port = 3000
$testEmail = "hocsinh_moi_" + (Get-Date -Format "yyyyMMddHHmmss") + "@gmail.com"
$testPass = "MatKhau123!"
$testName = "Nguyen Van Hoc Sinh"

$htmlTestContent = @"
<!DOCTYPE html>
<html>
<body>
<pre id="out">TESTING ADMIN MEMBERS LIST...</pre>
<script>
const out = document.getElementById("out");
function log(msg) {
  out.textContent += "\n" + msg;
  fetch('/api/test/log', { method: 'POST', body: msg }).catch(() => {});
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

    log("STEP 1: Switching to Register Tab");
    win.switchAuthGateTab("register");
    await new Promise(r => setTimeout(r, 400));

    log("STEP 2: Filling Form Fields");
    doc.getElementById("gate-reg-fullname").value = "$testName";
    doc.getElementById("gate-reg-email").value = "$testEmail";
    doc.getElementById("gate-reg-password").value = "$testPass";

    log("STEP 3: Submitting Register Form");
    doc.getElementById("btn-gate-register-submit").click();
    await new Promise(r => setTimeout(r, 500));

    log("STEP 4: Robot Pane Shown -> Clicking 'Khong' (Human)");
    doc.getElementById("btn-robot-answer-no").click();

    // Wait for registration to complete
    let registeredUser = null;
    for (let i = 1; i <= 6; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (win.geoAuth && win.geoAuth.isAuthenticated()) {
        registeredUser = win.geoAuth.currentUser;
        log("Registration finished: " + registeredUser.email);
        break;
      }
    }

    if (!registeredUser) {
      log("FAIL: Registration did not complete!");
      return;
    }

    log("STEP 5: Switching session to Admin (hshk.project@gmail.com)");
    const adminUser = {
      id: "usr-admin-hshk",
      name: "Ban Dieu Hanh HSHK",
      email: "hshk.project@gmail.com",
      role: "admin",
      userType: "Admin"
    };
    win.geoAuth.setCurrentUser(adminUser);
    win.updateAuthUI();

    log("STEP 6: Navigating to Admin Panel Tab");
    win.switchTab("admin-panel");
    await new Promise(r => setTimeout(r, 600));

    log("STEP 7: Checking if newly registered user appears in Admin Member List");
    const allUsers = win.geoAuth.getAllUsers();
    log("Total allUsers count: " + allUsers.length);
    const foundInAll = allUsers.find(u => u.email && u.email.toLowerCase() === "$testEmail".toLowerCase());
    log("Found in getAllUsers()? " + (foundInAll ? "YES" : "NO"));

    const tableBody = doc.getElementById("admin-users-table-body");
    const tableText = tableBody ? tableBody.innerText : "";
    const foundInTable = tableText.includes("$testEmail") || tableText.includes("$testName");
    log("Found in Admin table HTML? " + (foundInTable ? "YES" : "NO"));

    const userCountText = doc.getElementById("adm-stat-users") ? doc.getElementById("adm-stat-users").textContent : "";
    log("adm-stat-users count: " + userCountText);

    if (foundInAll && foundInTable) {
      log("SUCCESS: NEWLY_CREATED_ACCOUNT_APPEARS_IN_ADMIN_MEMBERS_LIST");
    } else {
      log("FAIL: Account missing from admin members list!");
    }
  } catch(e) {
    log("FAIL_ERR: " + e.message);
  }
}
window.addEventListener("load", start);
</script>
</body>
</html>
"@

$testHtmlPath = Join-Path $PSScriptRoot "..\test_runner_admin_members.html"
[System.IO.File]::WriteAllText($testHtmlPath, $htmlTestContent, [System.Text.Encoding]::UTF8)

$logPath = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logPath -ErrorAction SilentlyContinue

$profile = Join-Path $PSScriptRoot ("..\tmp_edge_run_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--remote-debugging-port=9230", "--user-data-dir=$profile", "http://localhost:$port/test_runner_admin_members.html" -PassThru
Start-Sleep -Seconds 25
Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $testHtmlPath -Force -ErrorAction SilentlyContinue

if (Test-Path $logPath) {
    Get-Content $logPath
    Remove-Item $logPath -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "No log output."
}
