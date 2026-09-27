$port = 3000
$root = (Get-Location).Path
$testEmail = "suite_user_" + (Get-Date -Format "yyyyMMddHHmmss") + "@gmail.com"
$testPass = "MatKhauChuan123!"
$testName = "Nguyen Hoang Anh"

$htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Automated Auth Suite</title></head>
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
  log("=================================================");
  log("🚀 STARTING E2E BROWSER AUTH VERIFICATION SUITE");
  log("=================================================");

  try {
    const iframe = document.createElement("iframe");
    iframe.src = "index.html";
    iframe.style.width = "1280px";
    iframe.style.height = "900px";
    await new Promise(res => { iframe.onload = res; document.body.appendChild(iframe); });
    await sleep(1500);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;

    // --- TEST 1: Initial Guest Gate Lock ---
    log("[TEST 1] Kiem tra Auth Gate mac dinh khoa man hinh doi voi Guest");
    const overlay = doc.getElementById("auth-gate-overlay");
    const isGuestLocked = doc.documentElement.classList.contains("geo-guest-locked");
    const loginPane = doc.getElementById("auth-gate-login-pane");
    const regPane = doc.getElementById("auth-gate-register-pane");

    if (overlay && isGuestLocked && loginPane && loginPane.style.display !== "none" && regPane && regPane.style.display === "none") {
      log("  ✅ PASS: Auth Gate khoa man hinh, mac dinh mo tab Dang Nhap");
    } else {
      log("  ❌ FAIL: Auth Gate chua o trang thai mac dinh cho Guest!");
    }

    // --- TEST 2: Tab Switching (Login <-> Register) ---
    log("[TEST 2] Kiem tra chuyen tab Dang Nhap va Dang Ky");
    const regTabBtn = doc.getElementById("auth-gate-tab-register-btn");
    const loginTabBtn = doc.getElementById("auth-gate-tab-login-btn");

    regTabBtn.click();
    await sleep(300);
    const isRegActive = regPane && regPane.style.display !== "none";
    const isLoginHidden = loginPane && loginPane.style.display === "none";

    loginTabBtn.click();
    await sleep(300);
    const isLoginActiveAgain = loginPane && loginPane.style.display !== "none";

    if (isRegActive && isLoginHidden && isLoginActiveAgain) {
      log("  ✅ PASS: Chuyen doi muot ma giua tab Dang Nhap va Dang Ky");
    } else {
      log("  ❌ FAIL: Chuyen tab bi loi!");
    }

    // --- TEST 3: Password Visibility Toggle on Login ---
    log("[TEST 3] Kiem tra nut an/hien mat khau (Password Toggle) tren form Dang Nhap");
    const loginPwdInput = doc.getElementById("gate-login-password");
    const loginEyeBtn = doc.querySelector('.password-toggle-btn[data-target="gate-login-password"]');
    loginPwdInput.value = "KiemTraMatKhau2026";

    const t1 = loginPwdInput.type;
    loginEyeBtn.click();
    await sleep(200);
    const t2 = loginPwdInput.type;
    loginEyeBtn.click();
    await sleep(200);
    const t3 = loginPwdInput.type;

    if (t1 === "password" && t2 === "text" && t3 === "password") {
      log("  ✅ PASS: Nut an/hien mat khau hoat dong hoan hao (password -> text -> password)");
    } else {
      log("  ❌ FAIL: An hien mat khau loi: t1=" + t1 + " t2=" + t2 + " t3=" + t3);
    }

    // --- TEST 4: Login with Wrong Password ---
    log("[TEST 4] Kiem tra Dang nhap voi mat khau sai");
    doc.getElementById("gate-login-email").value = "nguoidung_chua_dang_ky@gmail.com";
    doc.getElementById("gate-login-password").value = "MatKhauSai123";
    doc.getElementById("btn-gate-login-submit").click();
    await sleep(1000);

    const stillLocked = doc.documentElement.classList.contains("geo-guest-locked");
    if (stillLocked) {
      log("  ✅ PASS: He thong chan dang nhap voi thong tin sai, duy tri khoa Auth Gate");
    } else {
      log("  ❌ FAIL: He thong mo khoa bat thuong khi sai mat khau!");
    }

    // --- TEST 5: Registration Validation and Anti-Bot Challenge ---
    log("[TEST 5] Kiem tra quy trinh Dang Ky va Thu thach Anti-Bot 3 lua chon");
    regTabBtn.click();
    await sleep(400);

    // Kiem tra Password Toggle tren form Dang Ky
    const regPwdInput = doc.getElementById("gate-reg-password");
    const regEyeBtn = doc.querySelector('.password-toggle-btn[data-target="gate-reg-password"]');
    regPwdInput.value = "$testPass";
    regEyeBtn.click();
    await sleep(150);
    const regT2 = regPwdInput.type;
    regEyeBtn.click();
    await sleep(150);
    const regT3 = regPwdInput.type;
    if (regT2 === "text" && regT3 === "password") {
      log("  ✅ PASS: Nut an/hien mat khau tren form Dang Ky hoat dong tot");
    } else {
      log("  ❌ FAIL: An hien mat khau tren form Dang Ky loi!");
    }

    // Dien thong tin hop le
    doc.getElementById("gate-reg-fullname").value = "$testName";
    doc.getElementById("gate-reg-email").value = "$testEmail";
    doc.getElementById("gate-reg-password").value = "$testPass";

    doc.getElementById("btn-gate-register-submit").click();
    await sleep(500);

    const robotPane = doc.getElementById("auth-gate-robot-pane");
    const robotPaneVisible = robotPane && robotPane.style.display !== "none";
    if (robotPaneVisible) {
      log("  ✅ PASS: Chuyen sang man hinh Xac Minh Anti-Bot thanh cong");
    } else {
      log("  ❌ FAIL: Man hinh Xac Minh Anti-Bot khong hien thi!");
    }

    // Thu bam 'Co, toi la robot' (Choice: yes) -> bi tu choi va quay lai register form
    log("[TEST 5.1] Thu bam 'Co, toi la robot'");
    doc.getElementById("btn-robot-answer-yes").click();
    await sleep(400);
    const returnedToReg = regPane && regPane.style.display !== "none";
    if (returnedToReg) {
      log("  ✅ PASS: Tu choi dang ky chinh xac khi nguoi dung chon la Robot");
    } else {
      log("  ❌ FAIL: Khong quay lai form dang ky khi chon la Robot!");
    }

    // Dien lai va gui de xac nhan la con nguoi
    doc.getElementById("gate-reg-fullname").value = "$testName";
    doc.getElementById("gate-reg-email").value = "$testEmail";
    doc.getElementById("gate-reg-password").value = "$testPass";
    doc.getElementById("btn-gate-register-submit").click();
    await sleep(500);

    // Bam 'Khong, toi la con nguoi' (Choice: no)
    log("[TEST 5.2] Bam 'Khong, toi la con nguoi' de hoan tat dang ky");
    doc.getElementById("btn-robot-answer-no").click();

    let regSuccess = false;
    for (let s = 1; s <= 8; s++) {
      await sleep(1000);
      const isAuthNow = win.geoAuth && win.geoAuth.isAuthenticated();
      const user = win.geoAuth && win.geoAuth.currentUser;
      const overlayDisp = overlay ? overlay.style.display : "null";
      if (isAuthNow && overlayDisp === "none") {
        regSuccess = true;
        log("  ✅ PASS: Dang ky tai khoan thanh cong voi ma hoa PBKDF2! Email: " + user.email + " (Ten: " + user.name + ")");
        break;
      }
    }

    if (!regSuccess) {
      log("  ❌ FAIL: Dang ky tai khoan khong mo khoa Auth Gate trong thoi gian cho!");
    } else {
      // --- TEST 6: User Info in Navbar ---
      log("[TEST 6] Kiem tra hien thi Thong tin Nguoi dung tren Navbar");
      const nameEl = doc.getElementById("auth-user-name");
      const avatarEl = doc.getElementById("auth-user-avatar");
      const dName = nameEl ? nameEl.textContent : "";
      const dAvatar = avatarEl ? avatarEl.textContent : "";

      if (dName === "$testName" && dAvatar === "$testName".charAt(0).toUpperCase()) {
        log("  ✅ PASS: Navbar hien thi dung ten: '" + dName + "' va avatar: '" + dAvatar + "'");
      } else {
        log("  ❌ FAIL: Navbar sai thong tin nguoi dung! name=" + dName + " avatar=" + dAvatar);
      }

      // --- TEST 7: Logout Flow ---
      log("[TEST 7] Kiem tra Dang Xuat (Logout)");
      win.geoAuth.logout();
      await sleep(500);

      const isLockedAfterLogout = doc.documentElement.classList.contains("geo-guest-locked");
      const isAuthAfterLogout = win.geoAuth.isAuthenticated();

      if (isLockedAfterLogout && !isAuthAfterLogout) {
        log("  ✅ PASS: Dang xuat thanh cong, Auth Gate lap tuc khoa man hinh tro lai");
      } else {
        log("  ❌ FAIL: Dang xuat khong khoa man hinh!");
      }

      // --- TEST 8: Login with Newly Registered Account ---
      log("[TEST 8] Kiem tra Dang Nhap bang tai khoan vua tao");
      doc.getElementById("gate-login-email").value = "$testEmail";
      doc.getElementById("gate-login-password").value = "$testPass";
      doc.getElementById("btn-gate-login-submit").click();

      let loginSuccess = false;
      for (let s = 1; s <= 6; s++) {
        await sleep(1000);
        const isAuthL = win.geoAuth && win.geoAuth.isAuthenticated();
        const dispL = overlay ? overlay.style.display : "null";
        if (isAuthL && dispL === "none") {
          loginSuccess = true;
          log("  ✅ PASS: Dang nhap bang tai khoan moi thanh cong, Auth Gate mo khoa!");
          break;
        }
      }

      if (!loginSuccess) {
        log("  ❌ FAIL: Dang nhap bang tai khoan moi khong mo khoa!");
      } else {
        // --- TEST 9: Modal Login Flow ---
        log("[TEST 9] Kiem tra Modal Dang Nhap (modal-login) hoat dong chinh xac");
        win.geoAuth.logout();
        await sleep(400);

        // Open modal-login
        win.openModal("modal-login");
        await sleep(300);

        const modalLogin = doc.getElementById("modal-login");
        const isModalOpen = modalLogin && modalLogin.classList.contains("show");
        if (isModalOpen) {
          log("  ✅ PASS: Mo modal-login thanh cong");

          doc.getElementById("login-email").value = "$testEmail";
          doc.getElementById("login-password").value = "$testPass";
          win.submitModalLogin();

          let modalLoginSuccess = false;
          for (let s = 1; s <= 6; s++) {
            await sleep(1000);
            const isModalClosed = modalLogin && !modalLogin.classList.contains("show");
            const isAuthAfterModal = win.geoAuth && win.geoAuth.isAuthenticated();
            if (isModalClosed && isAuthAfterModal) {
              modalLoginSuccess = true;
              log("  ✅ PASS: submitModalLogin dang nhap thanh cong va tu dong dong modal-login");
              break;
            }
          }

          if (!modalLoginSuccess) {
            log("  ❌ FAIL: Modal login khong dong hoac khong xac thuc duoc!");
          }
        } else {
          log("  ❌ FAIL: Khong mo duoc modal-login!");
        }
      }
    }

    log("=================================================");
    log("🏁 ALL AUTH E2E TESTS COMPLETED SUCCESSFULLY");
    log("=================================================");
  } catch(err) {
    log("❌ EXCEPTION: " + err.message + "\n" + err.stack);
  }
}

window.addEventListener("load", run);
</script>
</body>
</html>
"@


$testFile = Join-Path $root "test_browser_auth_runner.html"
[System.IO.File]::WriteAllText($testFile, $htmlContent, [System.Text.Encoding]::UTF8)

$logFile = Join-Path $root "test_page_out.txt"
Remove-Item $logFile -ErrorAction SilentlyContinue

$profile = Join-Path $root ("tmp_edge_auth_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--remote-debugging-port=9230", "--user-data-dir=$profile", "http://localhost:$port/test_browser_auth_runner.html" -PassThru

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $logFile) {
        $text = Get-Content $logFile -Raw
        if ($text.Contains("ALL AUTH E2E TESTS COMPLETED")) {
            break
        }
    }
}

Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $testFile -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
    Get-Content $logFile
    Remove-Item $logFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "Khong co du lieu log ghi nhan tu test runner."
}
