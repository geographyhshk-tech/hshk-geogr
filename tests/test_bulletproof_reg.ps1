$port = 3000
$testEmail = "live_user_" + (Get-Date -Format "yyyyMMddHHmmss") + "@gmail.com"
$testPass = "MatKhau123!"
$testName = "Nguyen Van Thanh Cong"

$htmlTestContent = @"
<!DOCTYPE html>
<html>
<body>
<pre id="out">TESTING...</pre>
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

    for (let i = 1; i <= 6; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
      const currentUser = win.geoAuth && win.geoAuth.currentUser;
      const overlay = doc.getElementById("auth-gate-overlay");
      const overlayDisplay = overlay ? overlay.style.display : "null";
      const htmlClass = doc.documentElement.className;
      log("[T+" + i + "s] isAuth=" + isAuth + " user=" + (currentUser ? currentUser.email : "null") + " overlay=" + overlayDisplay + " htmlClass=" + htmlClass);
      if (isAuth && overlayDisplay === "none") {
        log("SUCCESS: REGISTRATION_UNLOCKED_MAIN_PAGE");
        break;
      }
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

$testHtmlPath = Join-Path $PSScriptRoot "..\test_runner.html"
[System.IO.File]::WriteAllText($testHtmlPath, $htmlTestContent, [System.Text.Encoding]::UTF8)

$logPath = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logPath -ErrorAction SilentlyContinue

$profile = Join-Path $PSScriptRoot ("..\tmp_edge_run_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--remote-debugging-port=9228", "--user-data-dir=$profile", "http://localhost:$port/test_runner.html" -PassThru
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

