$port = 3000
$root = (Get-Location).Path

$htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Diagnose Registration</title></head>
<body>
<pre id="log" style="font-family: monospace; font-size: 13px; background: #111; color: #00ff66; padding: 12px;"></pre>
<script>
const logEl = document.getElementById("log");
function log(msg) {
  logEl.textContent += "\n" + msg;
  fetch('/api/test/log', { method: 'POST', body: msg }).catch(() => {});
}

window.onerror = function(msg, url, line) {
  log("PARENT WINDOW ERROR: " + msg + " at " + url + ":" + line);
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  log("==========================================");
  log("DIAGNOSING REGISTRATION COMPREHENSIVE");
  log("==========================================");

  try {
    const iframe = document.createElement("iframe");
    iframe.src = "index.html";
    iframe.style.width = "1280px";
    iframe.style.height = "900px";
    await new Promise(res => { iframe.onload = res; document.body.appendChild(iframe); });
    await sleep(2000);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;

    win.onerror = function(msg, url, line) {
      log("IFRAME ERROR: " + msg + " (Line: " + line + ")");
    };

    // 1. Inspect elements
    log("\n[TEST 1] Elements check:");
    log("  auth-gate-tab-register-btn: " + Boolean(doc.getElementById("auth-gate-tab-register-btn")));
    log("  auth-gate-register-pane: " + Boolean(doc.getElementById("auth-gate-register-pane")));
    log("  gate-reg-fullname: " + Boolean(doc.getElementById("gate-reg-fullname")));
    log("  gate-reg-email: " + Boolean(doc.getElementById("gate-reg-email")));
    log("  gate-reg-password: " + Boolean(doc.getElementById("gate-reg-password")));
    log("  gate-reg-usertype: " + Boolean(doc.getElementById("gate-reg-usertype")));
    log("  btn-gate-register-submit: " + Boolean(doc.getElementById("btn-gate-register-submit")));
    log("  form-auth-gate-register: " + Boolean(doc.getElementById("form-auth-gate-register")));
    log("  modal-register: " + Boolean(doc.getElementById("modal-register")));
    log("  reg-fullname: " + Boolean(doc.getElementById("reg-fullname")));
    log("  reg-email: " + Boolean(doc.getElementById("reg-email")));
    log("  reg-password: " + Boolean(doc.getElementById("reg-password")));
    log("  btn-register-submit: " + Boolean(doc.getElementById("btn-register-submit")));
    log("  auth-gate-robot-pane: " + Boolean(doc.getElementById("auth-gate-robot-pane")));
    log("  modal-robot-verification: " + Boolean(doc.getElementById("modal-robot-verification")));
    log("  window.submitAuthGateRegister: " + typeof win.submitAuthGateRegister);
    log("  window.submitModalRegister: " + typeof win.submitModalRegister);
    log("  window.handleRobotVerificationChoice: " + typeof win.handleRobotVerificationChoice);
    log("  window.geoAuth.register: " + (win.geoAuth ? typeof win.geoAuth.register : "undefined"));

    // 2. Test switching to Register tab
    log("\n[TEST 2] Clicking Tab Register button:");
    doc.getElementById("auth-gate-tab-register-btn").click();
    await sleep(300);
    const regPane = doc.getElementById("auth-gate-register-pane");
    log("  Register pane display: " + (regPane ? regPane.style.display : "null"));

    // 3. Test submitting with blank form (checking validation & flag state)
    log("\n[TEST 3] Submitting empty register form:");
    doc.getElementById("btn-gate-register-submit").click();
    await sleep(300);
    log("  _isSubmittingGateReg: " + win._isSubmittingGateReg);
    log("  _pendingRegistrationData: " + JSON.stringify(win._pendingRegistrationData));

    // 4. Test filling in form and clicking Register
    const testEmail1 = "diag_user_" + Date.now() + "@gmail.com";
    log("\n[TEST 4] Filling valid fields with email: " + testEmail1);
    doc.getElementById("gate-reg-fullname").value = "Nguyen Van Test";
    doc.getElementById("gate-reg-email").value = testEmail1;
    doc.getElementById("gate-reg-password").value = "ValidPass123!";
    doc.getElementById("gate-reg-usertype").value = "Học sinh THCS";

    log("  Clicking btn-gate-register-submit...");
    doc.getElementById("btn-gate-register-submit").click();
    await sleep(800);

    const robotPane = doc.getElementById("auth-gate-robot-pane");
    log("  Robot pane display: " + (robotPane ? robotPane.style.display : "null"));
    log("  _pendingRegistrationData: " + JSON.stringify(win._pendingRegistrationData));

    // 5. Test clicking robot answer "no"
    log("\n[TEST 5] Clicking robot answer 'no':");
    const noBtn = doc.getElementById("btn-robot-answer-no");
    log("  noBtn exists: " + Boolean(noBtn));
    if (noBtn) {
      noBtn.click();
    }
    
    for (let s = 1; s <= 10; s++) {
      await sleep(500);
      const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
      const curUser = win.geoAuth && win.geoAuth.currentUser;
      const overlay = doc.getElementById("auth-gate-overlay");
      const overlayHidden = overlay && (overlay.style.display === "none" || overlay.classList.contains("hidden"));
      const isProcessing = win._isProcessingRobotVerification;
      log("  [Tick " + s + "] isAuth=" + isAuth + " isProcessing=" + isProcessing + " overlayHidden=" + overlayHidden + (curUser ? " user=" + curUser.email : ""));
      if (isAuth && overlayHidden) {
        log("  SUCCESS GATE REGISTRATION!");
        break;
      }
    }

    // 6. Test direct call to geoAuth.register
    log("\n[TEST 6] Direct call to geoAuth.register with another user:");
    const testEmail2 = "direct_user_" + Date.now() + "@gmail.com";
    try {
      const t0 = Date.now();
      const res = await win.geoAuth.register({
        fullName: "Direct User",
        email: testEmail2,
        password: "DirectPass123!",
        userType: "Học sinh THPT"
      });
      log("  Direct register took " + (Date.now() - t0) + "ms. Result user email: " + (res ? res.email : "null"));
    } catch(err) {
      log("  Direct register ERROR: " + err.message + "\n" + err.stack);
    }

    log("\n==========================================");
    log("DIAGNOSTIC COMPLETED");
    log("==========================================");
  } catch(err) {
    log("FATAL DIAGNOSTIC ERROR: " + err.message + "\n" + err.stack);
  }
}

window.addEventListener("load", run);
</script>
</body>
</html>
"@

$runnerPath = Join-Path $PSScriptRoot "..\test_diag_reg_runner.html"
[System.IO.File]::WriteAllText($runnerPath, $htmlContent, [System.Text.Encoding]::UTF8)

$logFile = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logFile -ErrorAction SilentlyContinue

$profile = Join-Path $PSScriptRoot ("..\tmp_diag_reg_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "http://localhost:$port/test_diag_reg_runner.html" -PassThru
Start-Sleep -Seconds 18
Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
  Get-Content $logFile
  Remove-Item $logFile -Force -ErrorAction SilentlyContinue
}
