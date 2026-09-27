$port = 3000
$testEmail = "modal_user_" + (Get-Date -Format "yyyyMMddHHmmss") + "@gmail.com"
$testPass = "ModalPass123!"
$testName = "Tran Modal Test"

$htmlTestContent = @"
<!DOCTYPE html>
<html>
<body>
<pre id="out">TESTING MODAL REGISTRATION...</pre>
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

    log("STEP 1: Opening modal-register directly");
    win.openModal("modal-register");
    await new Promise(r => setTimeout(r, 400));

    const regModal = doc.getElementById("modal-register");
    log("modal-register class: " + (regModal ? regModal.className : "null"));

    log("STEP 2: Filling Modal Form Fields");
    doc.getElementById("reg-fullname").value = "$testName";
    doc.getElementById("reg-email").value = "$testEmail";
    doc.getElementById("reg-password").value = "$testPass";

    log("STEP 3: Submitting Modal Register Form");
    const regForm = doc.getElementById("form-register");
    regForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 500));

    const robotModal = doc.getElementById("modal-robot-verification");
    const isRobotModalOpen = robotModal && robotModal.classList.contains("show");
    log("STEP 4: Robot Modal Shown? " + isRobotModalOpen);

    log("STEP 5: Clicking 'Khong' (Human) in Robot Modal");
    const humanBtn = robotModal.querySelector(".choice-human");
    if (humanBtn) {
      humanBtn.click();
    } else {
      log("FAIL: humanBtn not found in modal-robot-verification");
    }

    for (let i = 1; i <= 6; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
      const currentUser = win.geoAuth && win.geoAuth.currentUser;
      const overlay = doc.getElementById("auth-gate-overlay");
      const overlayDisplay = overlay ? overlay.style.display : "null";
      const isModalOpen = regModal.classList.contains("show");
      const isRobotOpen = robotModal.classList.contains("show");
      log("[T+" + i + "s] isAuth=" + isAuth + " user=" + (currentUser ? currentUser.email : "null") + " overlay=" + overlayDisplay + " regModalOpen=" + isModalOpen + " robotModalOpen=" + isRobotOpen);
      if (isAuth && overlayDisplay === "none" && !isModalOpen && !isRobotOpen) {
        log("SUCCESS: MODAL_REGISTRATION_COMPLETED_SEAMLESSLY");
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

$testHtmlPath = Join-Path $PSScriptRoot "..\test_runner_modal.html"
[System.IO.File]::WriteAllText($testHtmlPath, $htmlTestContent, [System.Text.Encoding]::UTF8)

$logPath = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logPath -ErrorAction SilentlyContinue

$profile = Join-Path $PSScriptRoot ("..\tmp_edge_run_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--remote-debugging-port=9229", "--user-data-dir=$profile", "http://localhost:$port/test_runner_modal.html" -PassThru
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
