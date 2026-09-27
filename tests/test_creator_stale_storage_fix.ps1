$port = 3000
$root = (Get-Location).Path
$logFile = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logFile -Force -ErrorAction SilentlyContinue

$htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Verify Creator Account Stale Storage Fix</title></head>
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

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  log("=================================================");
  log("TESTING CREATOR ACCOUNT LOGIN UNDER STALE CONDITIONS");
  log("=================================================");

  // STEP 1: Pre-seed localStorage with stale Google OAuth credentials for creator
  log("\n[SETUP] Pre-seeding localStorage with stale Google OAuth entry for vut510624@gmail.com...");
  const staleUsers = [
    {
      id: "usr-admin",
      name: "Trần Huy Vũ",
      email: "vut510624@gmail.com",
      password: "__google_oauth__",
      authProvider: "google",
      role: "admin",
      userType: "Admin",
      createdAt: "01/08/2026"
    }
  ];
  localStorage.setItem("geo_edu_users", JSON.stringify(staleUsers));
  localStorage.setItem("geo_login_attempts_vut510624@gmail.com", JSON.stringify({ attempts: 3, lockUntil: Date.now() + 100000 }));
  log("  Set geo_edu_users with password: '__google_oauth__'");
  log("  Set stale lockout attempts record");

  // STEP 2: Load index.html in iframe
  const iframe = document.createElement("iframe");
  iframe.src = "index.html";
  iframe.style.width = "1280px";
  iframe.style.height = "900px";
  await new Promise(res => { iframe.onload = res; document.body.appendChild(iframe); });
  await sleep(2000);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;

  const emailInput = doc.getElementById("gate-login-email");
  const pwdInput = doc.getElementById("gate-login-password");
  const submitBtn = doc.getElementById("btn-gate-login-submit");
  const overlay = doc.getElementById("auth-gate-overlay");

  let allPass = true;

  // TEST 1: Login as Creator with standard password '098397487818112010'
  log("\n[TEST 1] Logging in as creator (vut510624@gmail.com / 098397487818112010)");
  emailInput.value = "vut510624@gmail.com";
  pwdInput.value = "098397487818112010";

  let t0 = Date.now();
  submitBtn.click();

  let ok1 = false;
  for (let s = 1; s <= 20; s++) {
    await sleep(200);
    const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
    const user = win.geoAuth && win.geoAuth.currentUser;
    const isOverlayHidden = overlay && (overlay.style.display === "none" || overlay.classList.contains("hidden"));

    if (isAuth && isOverlayHidden && user && user.email === "vut510624@gmail.com") {
      log("  PASS: Creator logged in in " + (Date.now() - t0) + "ms!");
      log("    Name: " + user.name + ", Role: " + user.role + ", UserType: " + user.userType);
      ok1 = true;
      break;
    }
  }

  if (!ok1) {
    const toast = doc.getElementById("toast-container");
    log("  FAIL: Creator login failed! Toast: " + (toast ? toast.innerText.trim() : "none"));
    allPass = false;
  }

  // TEST 2: Logout and verify relogin with trailing spaces in password
  log("\n[TEST 2] Logging out and testing password with whitespace: ' 098397487818112010 '");
  await win.geoAuth.logout();
  await sleep(400);

  emailInput.value = " vut510624@gmail.com ";
  pwdInput.value = " 098397487818112010 ";

  t0 = Date.now();
  submitBtn.click();

  let ok2 = false;
  for (let s = 1; s <= 20; s++) {
    await sleep(200);
    const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
    const user = win.geoAuth && win.geoAuth.currentUser;
    const isOverlayHidden = overlay && (overlay.style.display === "none" || overlay.classList.contains("hidden"));

    if (isAuth && isOverlayHidden && user && user.email === "vut510624@gmail.com") {
      log("  PASS: Whitespace trimmed login succeeded in " + (Date.now() - t0) + "ms!");
      ok2 = true;
      break;
    }
  }

  if (!ok2) {
    const toast = doc.getElementById("toast-container");
    log("  FAIL: Whitespace login failed! Toast: " + (toast ? toast.innerText.trim() : "none"));
    allPass = false;
  }

  // TEST 3: Wrong password for creator should show clear error and NOT lock or crash
  log("\n[TEST 3] Testing incorrect password for creator");
  await win.geoAuth.logout();
  await sleep(400);

  emailInput.value = "vut510624@gmail.com";
  pwdInput.value = "WrongPassword999!";

  submitBtn.click();
  await sleep(800);

  const toast3 = doc.getElementById("toast-container");
  const toastText = toast3 ? toast3.innerText.trim() : "";
  log("  Toast message: " + toastText);
  if (!submitBtn.disabled && (toastText.includes("không chính xác") || toastText.includes("Mật khẩu"))) {
    log("  PASS: Proper error message shown and button re-enabled promptly.");
  } else {
    log("  FAIL: Unexpected response on wrong password. Disabled: " + submitBtn.disabled);
    allPass = false;
  }

  log("\n=================================================");
  if (allPass) {
    log("ALL 3 CREATOR TESTS PASSED PERFECTLY!");
  } else {
    log("SOME TESTS FAILED - REVIEW LOGS ABOVE");
  }
  log("=================================================");
}

window.addEventListener("load", run);
</script>
</body>
</html>
"@

$runnerPath = Join-Path $PSScriptRoot "..\test_creator_runner.html"
[System.IO.File]::WriteAllText($runnerPath, $htmlContent, [System.Text.Encoding]::UTF8)

$profile = Join-Path $PSScriptRoot ("..\tmp_creator_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "http://localhost:$port/test_creator_runner.html" -PassThru
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
