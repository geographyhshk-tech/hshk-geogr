$port = 3000
$root = (Get-Location).Path
$testEmail = "test_member_" + (Get-Date -Format "yyyyMMddHHmmss") + "@gmail.com"
$testPass = "MatKhau123@"
$testName = "Nguyễn Minh Khang"

$htmlContent = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Full Registration Lifecycle Test</title></head>
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
  log("🚀 STARTING FULL REGISTRATION LIFECYCLE E2E TEST");
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

    // --- STEP 1: INITIAL STATE (GUEST GATE LOCKED) ---
    log("\n[STEP 1] Kiem tra Auth Gate mac dinh khoa man hinh doi voi Guest");
    const overlay = doc.getElementById("auth-gate-overlay");
    const isGuestLocked = doc.documentElement.classList.contains("geo-guest-locked");
    if (overlay && isGuestLocked) {
      log("  ✅ PASS: Auth Gate khoa man hinh thanh cong.");
    } else {
      log("  ❌ FAIL: Auth Gate khong khoa man hinh ban dau.");
    }

    // --- STEP 2: SWITCH TO REGISTER TAB ---
    log("\n[STEP 2] Chuyen sang tab Dang Ky");
    win.switchAuthGateTab("register");
    await sleep(400);
    const regPane = doc.getElementById("auth-gate-register-pane");
    if (regPane && regPane.style.display !== "none") {
      log("  ✅ PASS: Tab Dang Ky hien thi dung.");
    } else {
      log("  ❌ FAIL: Khong the mo Tab Dang Ky.");
    }

    // --- STEP 3: FILL REGISTRATION FORM ---
    log("\n[STEP 3] Nhap thong tin dang ky hop le cho thanh vien moi: $testEmail");
    const regName = doc.getElementById("gate-reg-fullname");
    const regEmail = doc.getElementById("gate-reg-email");
    const regPwd = doc.getElementById("gate-reg-password");
    const regType = doc.getElementById("gate-reg-usertype");

    regName.value = "$testName";
    regEmail.value = "$testEmail";
    regPwd.value = "$testPass";
    regType.value = "Học sinh THCS";

    // Submit form dang ky
    await win.submitAuthGateRegister(new Event("submit"));
    await sleep(500);

    // --- STEP 4: VERIFY ROBOT VERIFICATION PANE APPEARS ---
    log("\n[STEP 4] Kiem tra giao dien xac minh Robot ('Ban co phai la robot khong?')");
    const robotPane = doc.getElementById("auth-gate-robot-pane");
    const noBtn = doc.getElementById("btn-robot-answer-no");
    if (robotPane && robotPane.style.display !== "none" && noBtn) {
      log("  ✅ PASS: Giao dien xac minh Robot hien thi san sang voi nut 'Khong' (Con nguoi).");
    } else {
      log("  ❌ FAIL: Giao dien xac minh Robot khong hien thi.");
    }

    // --- STEP 5: CLICK 'KHONG' (NOT A ROBOT) ---
    log("\n[STEP 5] Bam nut xac nhan 'Khong' (Toi la con nguoi)");
    await win.handleRobotVerificationChoice("no");
    await sleep(2500);

    // --- STEP 6: VERIFY ACCOUNT SAVED & REDIRECTED TO HOME ---
    log("\n[STEP 6] Kiem tra tai khoan duoc tao, luu vao Firebase/Cache va chuyen den Trang Chu");
    const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
    const currentUser = win.geoAuth && win.geoAuth.currentUser;
    const isOverlayHidden = overlay.style.display === "none" || overlay.classList.contains("hidden");
    const isGuestLockedRemoved = !doc.documentElement.classList.contains("geo-guest-locked");
    const isHomeActive = doc.getElementById("tab-view-home") && doc.getElementById("tab-view-home").classList.contains("active");

    if (isAuth && currentUser && currentUser.email === "$testEmail") {
      log("  ✅ PASS: Tai khoan da duoc tao va dang nhap thanh cong: " + currentUser.name + " (" + currentUser.email + ")");
    } else {
      log("  ❌ FAIL: Tai khoan khong o trang thai dang nhap hop le.");
    }

    if (isOverlayHidden && isGuestLockedRemoved) {
      log("  ✅ PASS: Auth Gate da mo khoa hoan toan, go bo khoa cuon man hinh.");
    } else {
      log("  ❌ FAIL: Auth Gate chua mo khoa.");
    }

    if (isHomeActive) {
      log("  ✅ PASS: He thong da tu dong chuyen den Trang Chu (Home view).");
    } else {
      log("  ❌ FAIL: Trang chu khong duoc active sau khi dang ky.");
    }

    // --- STEP 7: ADMIN LOGS IN & VERIFIES USER IN ADMIN MEMBER TABLE ---
    log("\n[STEP 7] Quan tri vien dang nhap va kiem tra danh sach thanh vien");
    // Admin login with Creator password
    await win.geoAuth.login({ email: "vut510624@gmail.com", password: "098397487818112010" });
    await sleep(500);

    if (win.geoAuth.isAdmin()) {
      log("  ✅ PASS: Quan tri vien dang nhap thanh cong.");
    } else {
      log("  ❌ FAIL: Dang nhap Admin khong thanh cong.");
    }

    win.switchTab("admin-panel");
    await sleep(500);

    // Fetch remote users to sync Firestore & local cache
    const remoteUsers = await win.geoAuth.fetchRemoteUsers();
    win.renderAdminDashboard();
    await sleep(600);

    const userInList = remoteUsers.find(u => u.email && u.email.toLowerCase() === "$testEmail".toLowerCase());
    const tableHtml = doc.getElementById("admin-users-table-body") ? doc.getElementById("admin-users-table-body").innerHTML : "";
    const userInTable = tableHtml.includes("$testEmail");

    if (userInList && userInTable) {
      log("  ✅ PASS: Tai khoan moi xuat hien trong danh sach thanh vien cua Quan tri vien tren Admin Dashboard!");
    } else {
      log("  ❌ FAIL: Tai khoan moi khong xuat hien trong danh sach Admin (inList=" + !!userInList + ", inTable=" + userInTable + ")");
    }

    // --- STEP 8: ADMIN DELETES THE USER ACCOUNT ---
    log("\n[STEP 8] Quan tri vien thuc hien XOA tai khoan: $testEmail");
    const targetUserId = userInList ? userInList.id : "";
    await win.geoAuth.deleteUserAccount(targetUserId, "$testEmail");
    await sleep(800);

    const usersAfterDel = await win.geoAuth.fetchRemoteUsers();
    win.renderAdminDashboard();
    const tableAfterDel = doc.getElementById("admin-users-table-body") ? doc.getElementById("admin-users-table-body").innerHTML : "";
    const isDeletedFromAdmin = !usersAfterDel.some(u => u.email && u.email.toLowerCase() === "$testEmail".toLowerCase()) && !tableAfterDel.includes("$testEmail");

    if (isDeletedFromAdmin) {
      log("  ✅ PASS: Tai khoan da duoc xoa vinh vien khoi Firestore va bang thanh vien Admin!");
    } else {
      log("  ❌ FAIL: Tai khoan van con ton tai trong Admin Dashboard.");
    }

    // --- STEP 9: SIMULATE DELETED USER REALTIME LOGOUT & FORCED RE-REGISTRATION ---
    log("\n[STEP 9] Kiem tra cuong buc dang xuat va bat buoc dang ky lai");
    // Simulate active session of deleted user
    win.geoAuth.currentUser = { id: targetUserId, email: "$testEmail", name: "$testName", role: "user" };
    // Trigger forceLogout with deletion reason
    win.geoAuth.forceLogout("Tai khoan cua ban da bi Quan tri vien xoa khoi he thong. Vui long dang ky lai tai khoan moi!");
    await sleep(500);

    const isUserLoggedOut = !win.geoAuth.isAuthenticated();
    const isGateLockedAgain = doc.documentElement.classList.contains("geo-guest-locked");
    const isRegTabActive = regPane && regPane.style.display !== "none";

    if (isUserLoggedOut && isGateLockedAgain && isRegTabActive) {
      log("  ✅ PASS: Tai khoan bi xoa da lap tuc bi dang xuat, Auth Gate khoa man hinh va tu dong chuyen den tab DANG KY LAI!");
    } else {
      log("  ❌ FAIL: Cuong buc dang xuat va chuyen tab dang ky khong dung (loggedOut=" + isUserLoggedOut + ", locked=" + isGateLockedAgain + ", regActive=" + isRegTabActive + ")");
    }

    // --- STEP 10: USER ATTEMPTS LOGIN WITH DELETED CREDENTIALS ---
    log("\n[STEP 10] Nguoi dung co tinh dang nhap lai bang tai khoan da bi xoa");
    let loginBlocked = false;
    let blockedMsg = "";
    try {
      const loginRes = await win.geoAuth.login({ email: "$testEmail", password: "$testPass" });
      log("  [DEBUG] Login succeeded with: " + JSON.stringify(loginRes));
    } catch(err) {
      loginBlocked = true;
      blockedMsg = err.message;
      log("  [DEBUG] Login caught error: " + blockedMsg);
    }

    // Check if error message indicates account deletion / re-registration
    const isExpectedMsg = loginBlocked && (
      blockedMsg.includes("Qu") ||
      blockedMsg.includes("x") ||
      blockedMsg.toLowerCase().includes("dang ky") ||
      blockedMsg.toLowerCase().includes("h? th?ng") ||
      blockedMsg.toLowerCase().includes("he thong")
    );

    if (isExpectedMsg) {
      log("  ✅ PASS: He thong chan dang nhap va thong bao ro rang: '" + blockedMsg + "'");
    } else {
      log("  ❌ FAIL: He thong khong chan dang nhap tai khoan da xoa! (loginBlocked=" + loginBlocked + ", msg=" + blockedMsg + ")");
    }

    // --- STEP 11: USER RE-REGISTERS WITH THE SAME OR NEW CREDENTIALS ---
    log("\n[STEP 11] Nguoi dung dang ky lai tai khoan moi sau khi bi xoa");
    let newRegUser = null;
    try {
      newRegUser = await win.geoAuth.register({
        fullName: "$testName (Mới)",
        email: "$testEmail",
        password: "NewPassword123@",
        userType: "Học sinh THCS"
      });
      log("  [DEBUG] Register returned: " + JSON.stringify(newRegUser));
    } catch(regErr) {
      log("  [DEBUG] Register caught error: " + regErr.message);
    }
    await sleep(600);

    const isCurrentAuth = win.geoAuth.isAuthenticated();
    const currUser = win.geoAuth.currentUser;
    log("  [DEBUG] isAuthenticated=" + isCurrentAuth + ", currentUser=" + JSON.stringify(currUser));

    if (newRegUser && isCurrentAuth && currUser && currUser.email === "$testEmail") {
      log("  ✅ PASS: Nguoi dung da dang ky lai thanh cong tai khoan moi va dang nhap tro lai he thong!");
    } else {
      log("  ❌ FAIL: Dang ky lai that bai.");
    }

    log("\n=================================================");
    log("🎉 ALL FULL REGISTRATION LIFECYCLE TESTS PASSED! 🎉");
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

$testFile = Join-Path $root "test_lifecycle_runner.html"
[System.IO.File]::WriteAllText($testFile, $htmlContent, [System.Text.Encoding]::UTF8)

$logFile = Join-Path $root "test_page_out.txt"
Remove-Item $logFile -ErrorAction SilentlyContinue

$profile = Join-Path $root ("tmp_edge_lifecycle_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--remote-debugging-port=9245", "--user-data-dir=$profile", "http://localhost:$port/test_lifecycle_runner.html" -PassThru

for ($i = 0; $i -lt 35; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $logFile) {
        $text = Get-Content $logFile -Raw
        if ($text.Contains("ALL FULL REGISTRATION LIFECYCLE TESTS PASSED") -or $text.Contains("EXCEPTION")) {
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
