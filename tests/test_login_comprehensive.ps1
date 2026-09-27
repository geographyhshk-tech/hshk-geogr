$port = 3000
$root = (Get-Location).Path
$logFile = Join-Path $root "test_page_out.txt"
Remove-Item $logFile -Force -ErrorAction SilentlyContinue

$testHtml = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Comprehensive Login Test</title></head>
<body>
<pre id="log" style="font-family: monospace; font-size: 13px; background: #0f172a; color: #38bdf8; padding: 20px;"></pre>
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

async function runTests() {
  log("=================================================");
  log("🚀 BẮT ĐẦU KIỂM THỬ TOÀN BỘ CHỨC NĂNG ĐĂNG NHẬP");
  log("=================================================");

  try {
    const iframe = document.createElement("iframe");
    iframe.src = "index.html";
    iframe.style.width = "1280px";
    iframe.style.height = "900px";
    await new Promise(res => { iframe.onload = res; document.body.appendChild(iframe); });
    await sleep(2500);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;

    win.onerror = function(msg, url, line) {
      log("IFRAME CONSOLE ERROR: " + msg + " (" + url + ":" + line + ")");
    };

    const overlay = doc.getElementById("auth-gate-overlay");
    const gateEmail = doc.getElementById("gate-login-email");
    const gatePwd = doc.getElementById("gate-login-password");
    const gateSubmit = doc.getElementById("btn-gate-login-submit");

    let totalPassed = 0;
    let totalChecks = 0;

    // Helper to ensure clean logged out state
    async function ensureLoggedOut() {
      if (win.geoAuth && win.geoAuth.isAuthenticated()) {
        await win.geoAuth.logout();
        await sleep(300);
      }
    }

    // --- SECTION 1: KIỂM TRA ĐĂNG NHẬP CÁC TÀI KHOẢN HỆ THỐNG & ĐÃ CÓ ---
    const accounts = [
      { name: "Super Admin (Trần Huy Vũ)", email: "vut510624@gmail.com", pass: "098397487818112010", expectedRole: "admin" },
      { name: "Super Admin alias (Admin@2026)", email: "vut510624@gmail.com", pass: "Admin@2026", expectedRole: "admin" },
      { name: "Ban Điều Hành HSHK", email: "hshk.project@gmail.com", pass: "098397487818112010", expectedRole: "admin" },
      { name: "Ban Điều Hành HSHK (Admin@2026)", email: "hshk.project@gmail.com", pass: "Admin@2026", expectedRole: "admin" },
      { name: "Học Sinh Mẫu (hocsinh@gmail.com)", email: "hocsinh@gmail.com", pass: "123456", expectedRole: "user" },
      { name: "Tài khoản học sinh có sẵn (hocsinh_moi)", email: "hocsinh_moi_20260918194401@gmail.com", pass: "MatKhau123!", expectedRole: "user" },
      { name: "Tài khoản học sinh có sẵn (modal_user)", email: "modal_user_20260918194616@gmail.com", pass: "ModalPass123!", expectedRole: "user" }
    ];

    for (let i = 0; i < accounts.length; i++) {
      totalChecks++;
      const acc = accounts[i];
      log("\n[KIỂM THỬ " + (i + 1) + "] Đăng nhập Gate: " + acc.name + " (" + acc.email + ")");
      await ensureLoggedOut();

      gateEmail.value = acc.email;
      gatePwd.value = acc.pass;

      const t0 = Date.now();
      gateSubmit.click();

      let ok = false;
      for (let s = 1; s <= 20; s++) {
        await sleep(200);
        const elapsed = Date.now() - t0;
        const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
        const user = win.geoAuth && win.geoAuth.currentUser;
        const isHidden = overlay && (overlay.style.display === "none" || overlay.classList.contains("hidden"));

        if (isAuth && isHidden) {
          log("  ✅ PASS: Đăng nhập thành công sau " + elapsed + "ms! Tên: " + user.name + ", Role: " + user.role);
          ok = true;
          totalPassed++;
          break;
        }

        if (!gateSubmit.disabled && elapsed > 1200) {
          const toast = doc.getElementById("toast-container") ? doc.getElementById("toast-container").innerText.trim() : "";
          log("  ❌ FAIL: Nút không khóa nhưng đăng nhập không thành công! Toast: " + toast);
          break;
        }
      }

      if (!ok && gateSubmit.disabled) {
        log("  ❌ FAIL: Nút đăng nhập bị treo/vô hiệu hóa quá lâu!");
      }
    }

    // --- SECTION 2: KIỂM THỬ ĐĂNG KÝ MỚI -> ĐĂNG XUẤT -> ĐĂNG NHẬP LẠI ---
    totalChecks++;
    log("\n[KIỂM THỬ " + (accounts.length + 1) + "] Đăng ký thành viên mới -> Đăng xuất -> Đăng nhập lại");
    await ensureLoggedOut();

    const newEmail = "test_member_" + Date.now() + "@gmail.com";
    const newPass = "MatKhauMoi2026@";
    const newName = "Đặng Hoàng Nam";

    win.switchAuthGateTab("register");
    await sleep(400);

    doc.getElementById("gate-reg-fullname").value = newName;
    doc.getElementById("gate-reg-email").value = newEmail;
    doc.getElementById("gate-reg-password").value = newPass;
    doc.getElementById("gate-reg-usertype").value = "Học sinh THCS";

    await win.submitAuthGateRegister(new Event("submit"));
    await sleep(500);

    // Xác nhận không phải robot
    await win.handleRobotVerificationChoice("no");
    await sleep(2500);

    const isRegOk = win.geoAuth && win.geoAuth.isAuthenticated() && win.geoAuth.currentUser.email === newEmail;
    if (!isRegOk) {
      log("  ❌ FAIL: Đăng ký ban đầu không thành công!");
    } else {
      log("  ✅ Đăng ký thành công và đã tự động đăng nhập: " + newEmail);
      // Đăng xuất
      await win.geoAuth.logout();
      await sleep(800);

      // Đăng nhập lại với tài khoản vừa đăng ký
      log("  Tiến hành đăng nhập lại bằng thông tin vừa tạo...");
      gateEmail.value = newEmail;
      gatePwd.value = newPass;
      gateSubmit.click();

      let reLoginOk = false;
      for (let s = 1; s <= 20; s++) {
        await sleep(200);
        if (win.geoAuth && win.geoAuth.isAuthenticated() && win.geoAuth.currentUser.email === newEmail) {
          const isHidden = overlay && (overlay.style.display === "none" || overlay.classList.contains("hidden"));
          if (isHidden) {
            reLoginOk = true;
            break;
          }
        }
      }

      if (reLoginOk) {
        log("  ✅ PASS: Tài khoản mới đăng ký đã đăng nhập lại thành công và mở khóa Auth Gate!");
        totalPassed++;
      } else {
        const toast = doc.getElementById("toast-container") ? doc.getElementById("toast-container").innerText.trim() : "";
        log("  ❌ FAIL: Không thể đăng nhập lại với tài khoản vừa tạo! Toast: " + toast);
      }
    }

    // --- SECTION 3: KIỂM THỬ ĐĂNG NHẬP QUA MODAL (modal-login) ---
    totalChecks++;
    log("\n[KIỂM THỬ " + (accounts.length + 2) + "] Đăng nhập qua Modal Đăng Nhập (modal-login)");
    await ensureLoggedOut();

    win.openModal("modal-login");
    await sleep(400);

    const modalEmail = doc.getElementById("login-email");
    const modalPwd = doc.getElementById("login-password");
    const modal = doc.getElementById("modal-login");

    modalEmail.value = "hocsinh@gmail.com";
    modalPwd.value = "123456";

    await win.submitModalLogin(new Event("submit"));
    await sleep(1500);

    const isModalAuth = win.geoAuth && win.geoAuth.isAuthenticated();
    const isModalClosed = modal && !modal.classList.contains("show");
    const isGateOpen = overlay && (overlay.style.display === "none" || overlay.classList.contains("hidden"));

    if (isModalAuth && isModalClosed && isGateOpen) {
      log("  ✅ PASS: Đăng nhập bằng Modal thành công, modal đóng và Auth Gate mở khóa!");
      totalPassed++;
    } else {
      log("  ❌ FAIL: Đăng nhập bằng Modal thất bại! (auth=" + isModalAuth + ", closed=" + isModalClosed + ", gateOpen=" + isGateOpen + ")");
    }

    // --- SECTION 4: KIỂM THỬ SAI MẬT KHẨU & TỰ ĐỘNG PHỤC HỒI NÚT ---
    totalChecks++;
    log("\n[KIỂM THỬ " + (accounts.length + 3) + "] Nhập sai mật khẩu: kiểm tra cảnh báo và phục hồi nút bấm");
    await ensureLoggedOut();

    gateEmail.value = "hocsinh@gmail.com";
    gatePwd.value = "MatKhauSaiChacChan999@";
    gateSubmit.click();

    let btnRecovered = false;
    for (let w = 1; w <= 15; w++) {
      await sleep(200);
      if (!gateSubmit.disabled) {
        btnRecovered = true;
        break;
      }
    }

    const toastText = doc.getElementById("toast-container") ? doc.getElementById("toast-container").innerText.trim() : "";
    const isToastShown = toastText.length > 0;
    const isStillLocked = doc.documentElement.classList.contains("geo-guest-locked");

    if (btnRecovered && !gateSubmit.disabled && isToastShown && isStillLocked) {
      log("  ✅ PASS: Hệ thống báo lỗi đúng, Auth Gate vẫn khóa, và nút bấm phục hồi không bị đơ/liệt!");
      totalPassed++;
    } else {
      log("  ❌ FAIL: Nút bấm bị đơ hoặc xử lý sai (recovered=" + btnRecovered + ", disabled=" + gateSubmit.disabled + ", toast=" + toastText + ")");
    }

    // --- TỔNG KẾT ---
    log("\n=================================================");
    log("🎉 HOÀN THÀNH KIỂM THỬ: " + totalPassed + " / " + totalChecks + " MỤC ĐẠT (PASS)!");
    log("=================================================");
  } catch(err) {
    log("❌ EXCEPTION TRONG QUÁ TRÌNH KIỂM THỬ: " + err.message + "\n" + err.stack);
  }
}

window.addEventListener("load", runTests);
</script>
</body>
</html>
"@

$runnerFile = Join-Path $root "test_login_runner.html"
[System.IO.File]::WriteAllText($runnerFile, $testHtml, [System.Text.Encoding]::UTF8)

$profile = Join-Path $root ("tmp_edge_login_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "http://localhost:$port/test_login_runner.html" -PassThru

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $logFile) {
        $text = Get-Content $logFile -Raw
        if ($text.Contains("HOÀN THÀNH KIỂM THỬ") -or $text.Contains("EXCEPTION")) {
            break
        }
    }
}

Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runnerFile -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
    Get-Content $logFile
    Remove-Item $logFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "Không nhận được dữ liệu log."
}
