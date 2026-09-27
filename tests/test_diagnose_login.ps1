$port = 3000
$root = (Get-Location).Path

$htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Debug Login Button</title></head>
<body>
<pre id="log" style="font-family: monospace; font-size: 13px; background: #111; color: #00ff66; padding: 12px;"></pre>
<script>
const logEl = document.getElementById("log");
function log(msg) {
  logEl.textContent += "\n" + msg;
  fetch('/api/test/log', { method: 'POST', body: msg }).catch(() => {});
}

window.onerror = function(msg, url, line, col, error) {
  log("PARENT WINDOW ERROR: " + msg + " at " + url + ":" + line);
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  log("==========================================");
  log("DIAGNOSING LOGIN BUTTON FREEZE / FAILURE");
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

    // Capture iframe errors
    win.onerror = function(msg, url, line, col, err) {
      log("IFRAME ERROR: " + msg + " (Line: " + line + ")");
    };

    log("\n[STATE 1] Initial State of Login Button:");
    const btn = doc.getElementById("btn-gate-login-submit");
    const emailInput = doc.getElementById("gate-login-email");
    const pwdInput = doc.getElementById("gate-login-password");
    log("  Button exists: " + (!!btn));
    log("  Button disabled: " + (btn ? btn.disabled : "N/A"));
    log("  Button innerHTML: " + (btn ? btn.innerHTML.replace(/\s+/g, ' ').trim() : "N/A"));

    // Check account attempt status in localStorage
    log("\n[STATE 2] Checking Attempt / Lock Data in localStorage:");
    for (let i = 0; i < win.localStorage.length; i++) {
      const k = win.localStorage.key(i);
      if (k.includes("attempt") || k.includes("lock") || k.includes("geo_auth")) {
        log("  Key: " + k + " = " + win.localStorage.getItem(k));
      }
    }

    // Try Login as Admin
    log("\n[ACTION 1] Entering credentials for vut510624@gmail.com and submitting:");
    emailInput.value = "vut510624@gmail.com";
    pwdInput.value = "098397487818112010";

    const tStart = Date.now();
    log("  Clicking submit button...");
    btn.click();

    // Monitor button state every 200ms
    for (let s = 1; s <= 25; s++) {
      await sleep(200);
      const elapsed = Date.now() - tStart;
      const isDis = btn.disabled;
      const bText = btn.innerText.trim();
      const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
      const curUser = win.geoAuth && win.geoAuth.currentUser;
      const toastEl = doc.getElementById("toast-container") || doc.querySelector(".toast, .toast-notification, [class*='toast']");
      const toastText = toastEl ? toastEl.innerText.trim() : "";
      
      log("  [" + elapsed + "ms] disabled=" + isDis + " btnText='" + bText + "' isAuth=" + isAuth + (curUser ? " user=" + curUser.email : "") + (toastText ? " toast='" + toastText + "'" : ""));
      if (isAuth) {
        log("  SUCCESS: Logged in after " + elapsed + "ms!");
        break;
      }
      if (!isDis && elapsed > 1000) {
        log("  NOTICE: Button re-enabled without auth (error occurred). Check toasts above.");
        break;
      }
    }

    // Now test student login: hocsinh@gmail.com with its password
    log("\n[ACTION 2] Testing login with hocsinh@gmail.com:");
    const allKnown = win.geoAuth.getAllUsers();
    const studentUser = allKnown.find(u => u.email === "hocsinh@gmail.com");
    log("  Student user found in DB: " + (!!studentUser));
    if (studentUser) {
      log("  Stored password hash: " + studentUser.password);
    }

    // Direct test verifyPassword
    log("\n[ACTION 3] Direct verifyPassword test for Admin:");
    const adminUser = allKnown.find(u => u.email === "vut510624@gmail.com");
    if (adminUser) {
      log("  Admin stored hash: " + adminUser.password);
      try {
        const t0 = Date.now();
        const vResult = await win.verifyPassword("098397487818112010", adminUser.password, adminUser.passwordVault);
        log("  verifyPassword('098397487818112010') result: " + vResult + " (took " + (Date.now() - t0) + "ms)");
      } catch(e) {
        log("  verifyPassword ERROR: " + e.message);
      }
    }

    log("\n==========================================");
    log("DIAGNOSTIC FINISHED");
    log("==========================================");
  } catch(err) {
    log("FATAL DIAGNOSTIC EXCEPTION: " + err.message + "\n" + err.stack);
  }
}

window.addEventListener("load", run);
</script>
</body>
</html>
"@

$runnerPath = Join-Path $PSScriptRoot "..\test_diag_runner.html"
[System.IO.File]::WriteAllText($runnerPath, $htmlContent, [System.Text.Encoding]::UTF8)

$logFile = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logFile -ErrorAction SilentlyContinue

$profile = Join-Path $PSScriptRoot ("..\tmp_diag_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "http://localhost:$port/test_diag_runner.html" -PassThru
Start-Sleep -Seconds 15
Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
    Get-Content $logFile
    Remove-Item $logFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "No log received."
}
