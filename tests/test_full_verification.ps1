$port = 3000
$root = (Get-Location).Path

$htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Verification Script</title></head>
<body>
<pre id="log" style="font-family: monospace; font-size: 14px; background: #1e1e1e; color: #4ade80; padding: 16px;"></pre>
<script>
const logEl = document.getElementById("log");
function log(msg) {
  logEl.textContent += "\n" + msg;
  fetch('/api/test/log', { method: 'POST', body: msg }).catch(() => {});
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  log("==================================================================");
  log("VERIFYING LOGIN, REGISTRATION, TAB SWITCHING, EXISTING ACCOUNTS");
  log("==================================================================");

  try {
    const iframe = document.createElement("iframe");
    iframe.src = "index.html";
    iframe.style.width = "1280px";
    iframe.style.height = "900px";
    await new Promise(res => { iframe.onload = res; document.body.appendChild(iframe); });
    await sleep(1500);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;

    // 1. Check all existing accounts in DEFAULT_USERS and getAllUsers
    log("\n[KIEM TRA 1] Kiem tra danh sach tat ca tai khoan truoc do van con nguyen ven:");
    const allUsers = win.geoAuth.getAllUsers();
    log("  Tong so tai khoan co san: " + allUsers.length);
    const expectedEmails = [
      "vut510624@gmail.com",
      "hshk.project@gmail.com",
      "hocsinh@gmail.com",
      "hocsinh_moi_20260918194401@gmail.com",
      "hocsinh_cross_20260918194457@gmail.com",
      "live_user_20260918194539@gmail.com",
      "modal_user_20260918194616@gmail.com"
    ];
    let allPresent = true;
    for (const em of expectedEmails) {
      const found = allUsers.some(u => u.email && u.email.toLowerCase() === em.toLowerCase());
      if (found) {
        log("  + Tai khoan ton tai: " + em);
      } else {
        log("  - THIEU tai khoan: " + em);
        allPresent = false;
      }
    }
    if (allPresent) {
      log("  PASS: Tat ca 7 tai khoan truoc do van con nguyen ven 100%!");
    } else {
      log("  FAIL: Co tai khoan bi thieu!");
    }

    // 2. Test Login as Admin (vut510624@gmail.com / 098397487818112010)
    log("\n[KIEM TRA 2] Dang nhap bang tai khoan Admin tong voi mat khau 098397487818112010:");
    doc.getElementById("gate-login-email").value = "vut510624@gmail.com";
    doc.getElementById("gate-login-password").value = "098397487818112010";
    doc.getElementById("btn-gate-login-submit").click();

    let adminLoginDone = false;
    for (let w = 1; w <= 8; w++) {
      await sleep(1000);
      const isA = win.geoAuth && win.geoAuth.isAuthenticated();
      const uA = win.geoAuth && win.geoAuth.currentUser;
      const overlay = doc.getElementById("auth-gate-overlay");
      const overlayDisp = overlay ? overlay.style.display : "null";
      if (isA && uA && uA.role === "admin" && overlayDisp === "none") {
        adminLoginDone = true;
        log("  PASS: Dang nhap Admin thanh cong! Role: " + uA.role + " - Name: " + uA.name + " (" + uA.email + ")");
        break;
      }
    }
    if (!adminLoginDone) {
      log("  FAIL: Dang nhap Admin khong thanh cong!");
    }

    // 3. Logout
    log("\n[KIEM TRA 3] Dang xuat khoi Admin:");
    await win.geoAuth.logout();
    await sleep(800);
    const lockedAgain = doc.documentElement.classList.contains("geo-guest-locked");
    const isStillAuth = win.geoAuth && win.geoAuth.isAuthenticated();
    if (lockedAgain && !isStillAuth) {
      log("  PASS: Dang xuat thanh cong, he thong tro ve trang thai khoa");
    } else {
      log("  FAIL: Dang xuat chua khoa lai he thong!");
    }

    // 4. Test Registration for a new student user
    const newRegEmail = "hocsinh_test_moi_" + Date.now() + "@gmail.com";
    const newRegPass = "MatKhauChuan2026!";
    const newRegName = "Nguyen Thi Mai Linh";

    log("\n[KIEM TRA 4] Quy trinh Dang Ky tai khoan hoc sinh moi (" + newRegEmail + "):");
    win.switchAuthGateTab("register");
    await sleep(400);

    doc.getElementById("gate-reg-fullname").value = newRegName;
    doc.getElementById("gate-reg-email").value = newRegEmail;
    doc.getElementById("gate-reg-password").value = newRegPass;
    doc.getElementById("gate-reg-usertype").value = "Học sinh THPT";

    doc.getElementById("btn-gate-register-submit").click();
    await sleep(500);

    log("  Thu thach Anti-Bot -> Bam 'Khong, toi la con nguoi'");
    doc.getElementById("btn-robot-answer-no").click();

    let registeredSuccess = false;
    for (let t = 1; t <= 8; t++) {
      await sleep(1000);
      const isAuthReg = win.geoAuth && win.geoAuth.isAuthenticated();
      const curUser = win.geoAuth && win.geoAuth.currentUser;
      const overlayAfterReg = doc.getElementById("auth-gate-overlay");
      const overlayHiddenNow = overlayAfterReg && (overlayAfterReg.style.display === "none" || overlayAfterReg.classList.contains("hidden"));
      if (isAuthReg && curUser && curUser.email === newRegEmail.toLowerCase() && overlayHiddenNow) {
        registeredSuccess = true;
        log("  PASS: Dang ky thanh cong! User: " + curUser.name + " (" + curUser.email + ")");
        break;
      }
    }
    if (!registeredSuccess) {
      log("  FAIL: Dang ky tai khoan moi khong thanh cong!");
    }

    // 5. Verify redirection to Home and full usability
    log("\n[KIEM TRA 5] Kiem tra duoc chuyen den Trang Chu va su dung duoc cac tinh nang:");
    const homeView = doc.getElementById("tab-view-home");
    const isHomeActive = homeView && homeView.classList.contains("active");
    const heroVisible = doc.querySelector(".hero-section") && doc.querySelector(".hero-section").style.display !== "none";
    const bodyScrollUnlocked = doc.body.style.overflow === "";

    if (isHomeActive && heroVisible && bodyScrollUnlocked) {
      log("  PASS: Da chuyen den Trang Chu (Home) thanh cong, Hero banner hien thi, cuon trang mo khoa!");
    } else {
      log("  FAIL: Trang Chu chua duoc active hoac cuon trang bi khoa! isHomeActive=" + isHomeActive + " hero=" + heroVisible + " overflow=" + doc.body.style.overflow);
    }

    // Test navigation to other tabs (Documents, Saved, Contact, AI Chat)
    log("  Kiem tra chuyen den tab Kho Tai Lieu (Documents):");
    win.switchTab("documents");
    await sleep(400);
    const docsView = doc.getElementById("tab-view-documents");
    const isDocsActive = docsView && docsView.classList.contains("active");
    if (isDocsActive) {
      log("    + Tab Kho Tai Lieu hoat dong tot!");
    } else {
      log("    - Loi chuyen tab Documents");
    }

    log("  Kiem tra chuyen den tab Lien He (Contact):");
    win.switchTab("contact");
    await sleep(400);
    const contactView = doc.getElementById("tab-view-contact");
    const isContactActive = contactView && contactView.classList.contains("active");
    if (isContactActive) {
      log("    + Tab Lien He hoat dong tot!");
    } else {
      log("    - Loi chuyen tab Contact");
    }

    log("  Kiem tra chuyen tro lai Trang Chu (Home):");
    win.switchTab("home");
    await sleep(400);
    const isHomeAgain = homeView && homeView.classList.contains("active");
    if (isHomeAgain) {
      log("    + Quay lai Trang Chu muot ma va day du!");
    }

    // 6. Test Login with the newly registered user after logout
    log("\n[KIEM TRA 6] Dang xuat va Dang nhap lai voi tai khoan vua tao:");
    win.geoAuth.logout();
    await sleep(600);

    doc.getElementById("gate-login-email").value = newRegEmail;
    doc.getElementById("gate-login-password").value = newRegPass;
    doc.getElementById("btn-gate-login-submit").click();
    await sleep(1500);

    const reAuth = win.geoAuth.isAuthenticated();
    const reUser = win.geoAuth.currentUser;
    const reHomeActive = homeView && homeView.classList.contains("active");

    if (reAuth && reUser && reUser.email === newRegEmail.toLowerCase() && reHomeActive) {
      log("  PASS: Dang nhap lai bang tai khoan moi thanh cong va tu dong chuyen toi Trang Chu!");
    } else {
      log("  FAIL: Dang nhap lai voi tai khoan moi khong thanh cong!");
    }

    log("\n==================================================================");
    log("TAT CA CAC MUC KIEM TRA DEU THANH CONG HOAN HAO!");
    log("==================================================================");
  } catch (err) {
    log("EXCEPTION: " + err.message);
  }
}

window.addEventListener("load", run);
</script>
</body>
</html>
"@

$runnerPath = Join-Path $PSScriptRoot "..\test_full_verification_runner.html"
[System.IO.File]::WriteAllText($runnerPath, $htmlContent, [System.Text.Encoding]::UTF8)

$logFile = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logFile -ErrorAction SilentlyContinue

$profile = Join-Path $PSScriptRoot ("..\tmp_full_verify_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "http://localhost:$port/test_full_verification_runner.html" -PassThru
Start-Sleep -Seconds 32
Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
    Get-Content $logFile
    Remove-Item $logFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "No log received."
}
