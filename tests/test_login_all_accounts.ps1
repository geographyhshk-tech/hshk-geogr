$port = 3000
$root = (Get-Location).Path
$logFile = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logFile -Force -ErrorAction SilentlyContinue

$htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Verify All Accounts Login</title></head>
<body>
<pre id="log" style="font-family: monospace; font-size: 14px; background: #1e1e1e; color: #4ade80; padding: 16px;"></pre>
<script>
const logEl = document.getElementById("log");
function log(msg) {
  logEl.textContent += "\n" + msg;
  try {
    fetch('/api/test/log', { method: 'POST', body: msg }).catch(() => {});
  } catch(e) {}
}

window.onerror = function(msg, url, line) {
  log("PARENT ERROR: " + msg + " (" + url + ":" + line + ")");
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  log("=================================================");
  log("TESTING LOGIN FOR ALL EXISTING ACCOUNTS");
  log("=================================================");

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
      log("IFRAME ERROR: " + msg + " (" + url + ":" + line + ")");
    };

    const emailInput = doc.getElementById("gate-login-email");
    const pwdInput = doc.getElementById("gate-login-password");
    const submitBtn = doc.getElementById("btn-gate-login-submit");
    const overlay = doc.getElementById("auth-gate-overlay");

    const accountsToTest = [
      { email: "vut510624@gmail.com", pass: "098397487818112010", expectedRole: "admin", name: "Tran Huy Vu (Super Admin)" },
      { email: "hshk.project@gmail.com", pass: "098397487818112010", expectedRole: "admin", name: "Ban Dieu Hanh HSHK" },
      { email: "hshk.project@gmail.com", pass: "Admin@2026", expectedRole: "admin", name: "Ban Dieu Hanh HSHK (alias)" },
      { email: "hocsinh@gmail.com", pass: "123456", expectedRole: "user", name: "Hoc Sinh Mau" },
      { email: "hocsinh_moi_20260918194401@gmail.com", pass: "MatKhau123!", expectedRole: "user", name: "Nguyen Van Hoc Sinh" },
      { email: "modal_user_20260918194616@gmail.com", pass: "ModalPass123!", expectedRole: "user", name: "Tran Modal Test" }
    ];

    let passedCount = 0;

    for (let i = 0; i < accountsToTest.length; i++) {
      const acc = accountsToTest[i];
      log("\n[TEST " + (i+1) + "] Testing account: " + acc.email + " (" + acc.name + ")");

      // Ensure logged out first
      if (win.geoAuth && win.geoAuth.isAuthenticated()) {
        await win.geoAuth.logout();
        await sleep(300);
      }

      emailInput.value = acc.email;
      pwdInput.value = acc.pass;

      const t0 = Date.now();
      submitBtn.click();

      let ok = false;
      for (let s = 1; s <= 20; s++) {
        await sleep(200);
        const elapsed = Date.now() - t0;
        const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
        const user = win.geoAuth && win.geoAuth.currentUser;
        const isOverlayHidden = overlay && (overlay.style.display === "none" || overlay.classList.contains("hidden"));
        
        if (isAuth && isOverlayHidden) {
          log("  PASS: Logged in successfully in " + elapsed + "ms! User: " + user.name + ", role: " + user.role);
          ok = true;
          passedCount++;
          break;
        }
        if (!submitBtn.disabled && elapsed > 1000) {
          const toast = doc.getElementById("toast-container");
          log("  FAIL: Button returned without login (" + elapsed + "ms). Toast: " + (toast ? toast.innerText.trim() : ""));
          break;
        }
      }

      if (!ok && submitBtn.disabled) {
        log("  FAIL: Button remained disabled/frozen!");
      }
    }

    // TEST WRONG PASSWORD & BUTTON RECOVERY
    log("\n[TEST WRONG PASSWORD & BUTTON RESPONSIVENESS]");
    if (win.geoAuth && win.geoAuth.isAuthenticated()) {
      await win.geoAuth.logout();
      await sleep(300);
    }
    emailInput.value = "hocsinh@gmail.com";
    pwdInput.value = "SaiMatKhau999!";
    submitBtn.click();
    
    // Wait for verification error response and button recovery (up to 2.5s)
    let reEnabled = false;
    for (let w = 1; w <= 15; w++) {
      await sleep(200);
      if (!submitBtn.disabled) {
        reEnabled = true;
        break;
      }
    }

    const btnStillDisabled = submitBtn.disabled;
    const btnText = submitBtn.innerText.trim();
    const guestStillLocked = doc.documentElement.classList.contains("geo-guest-locked");
    const toast = doc.getElementById("toast-container");
    log("  Wrong password attempted. Disabled: " + btnStillDisabled + ", BtnText: '" + btnText + "', GuestLocked: " + guestStillLocked + ", Toast: '" + (toast ? toast.innerText.trim() : "") + "'");
    if (reEnabled && !btnStillDisabled && guestStillLocked) {
      log("  PASS: Button is NOT frozen and properly re-enabled after error!");
      passedCount++;
    } else {
      log("  FAIL: Button is frozen or unlocked unexpectedly!");
    }

    log("\n=================================================");
    log("COMPLETED: " + passedCount + " / " + (accountsToTest.length + 1) + " checks PASSED!");
    log("=================================================");
  } catch(err) {
    log("FATAL TEST EXCEPTION: " + err.message + "\n" + err.stack);
  }
}

window.addEventListener("load", run);
</script>
</body>
</html>
"@

$runnerPath = Join-Path $PSScriptRoot "..\test_accounts_runner.html"
[System.IO.File]::WriteAllText($runnerPath, $htmlContent, [System.Text.Encoding]::UTF8)

$profile = Join-Path $PSScriptRoot ("..\tmp_acc_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "http://localhost:$port/test_accounts_runner.html" -PassThru
Start-Sleep -Seconds 18
Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
    Get-Content $logFile
    Remove-Item $logFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "No log received."
}
