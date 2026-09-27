/**
 * MODULE: AUTH GATE & ACCESS SECURITY CONTROLLER
 * Geography Edu - High School Help Kit
 * Dieu khien man hinh khoa khach (Auth Gate), Dang nhap, Dang ky, Xac thuc Anti-Bot 3 lua chon,
 * Dong bo giao dien Auth UI va Thanh dieu huong Mobile.
 */

const GeoAuthGateModule = (function () {
  let _pendingRegistrationData = null;
  let _isProcessingRobotVerification = false;

  function switchAuthGateTab(tab) {
    const loginBtn = document.getElementById("auth-gate-tab-login-btn");
    const regBtn = document.getElementById("auth-gate-tab-register-btn");
    const tabNav = document.querySelector(".auth-gate-tab-nav");
    const loginPane = document.getElementById("auth-gate-login-pane");
    const regPane = document.getElementById("auth-gate-register-pane");
    const robotPane = document.getElementById("auth-gate-robot-pane");

    if (loginPane) { loginPane.style.display = "none"; loginPane.classList.remove("active"); }
    if (regPane) { regPane.style.display = "none"; regPane.classList.remove("active"); }
    if (robotPane) { robotPane.style.display = "none"; robotPane.classList.remove("active"); }

    if (tab === "login") {
      if (tabNav) tabNav.style.display = "grid";
      if (loginBtn) loginBtn.classList.add("active");
      if (regBtn) regBtn.classList.remove("active");
      if (loginPane) {
        loginPane.style.display = "block";
        loginPane.classList.add("active");
      }
    } else if (tab === "register") {
      if (tabNav) tabNav.style.display = "grid";
      if (regBtn) regBtn.classList.add("active");
      if (loginBtn) loginBtn.classList.remove("active");
      if (regPane) {
        regPane.style.display = "block";
        regPane.classList.add("active");
      }
    } else if (tab === "robot") {
      if (tabNav) tabNav.style.display = "none";
      if (robotPane) {
        robotPane.style.display = "block";
        robotPane.classList.add("active");
      }
    }
  }

  function checkAuthGate() {
    const overlay = document.getElementById("auth-gate-overlay");
    if (!overlay) return;

    const isAuth = window.geoAuth && window.geoAuth.isAuthenticated();
    if (isAuth) {
      document.documentElement.classList.remove("geo-guest-locked");
      document.documentElement.classList.add("geo-logged-in");
      overlay.style.display = "none";
      overlay.classList.add("hidden");

      const openModals = document.querySelectorAll(".modal-backdrop.show");
      if (openModals.length === 0) {
        document.body.style.overflow = "";
      }
    } else {
      document.documentElement.classList.remove("geo-logged-in");
      document.documentElement.classList.add("geo-guest-locked");
      overlay.style.display = "flex";
      overlay.classList.remove("hidden");
      if (typeof closeAllModals === "function") closeAllModals();
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        const emailInput = document.getElementById("gate-login-email");
        if (emailInput && document.activeElement !== emailInput) {
          emailInput.focus();
        }
      }, 50);
    }
  }

  async function submitAuthGateLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById("gate-login-email");
    const pwdInput = document.getElementById("gate-login-password");
    const submitBtn = document.getElementById("btn-gate-login-submit");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = pwdInput ? pwdInput.value : "";

    if (!email || !password) {
      showToast("Vui long nhap day du Gmail va Mat khau!", "error");
      return;
    }

    const originalBtnContent = submitBtn ? submitBtn.innerHTML : "";
    let safetyTimer = null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Đang xác thực...</span>`;
      safetyTimer = setTimeout(() => {
        if (submitBtn && submitBtn.disabled) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnContent;
        }
      }, 4000);
    }

    try {
      const user = await window.geoAuth.login({ email, password });

      const isMaint = window.geoDB ? window.geoDB.isMaintenanceActive() : false;
      if (isMaint) {
        const userRole = (user.role || "").toLowerCase();
        const userType = user.userType || "";
        const userEmail = (user.email || "").toLowerCase().trim();
        const isUserAdmin = (userRole === "admin" || userType === "Admin" || userEmail === "vut510624@gmail.com" || userEmail === "hshk.project@gmail.com");

        if (!isUserAdmin) {
          await window.geoAuth.logout();
          if (typeof updateMaintenanceUI === "function") updateMaintenanceUI();
          showToast("Hệ thống đang trong Chế Độ Bảo Trì! Chỉ tài khoản Quản trị viên (Admin) mới có quyền đăng nhập.", "error");
          return;
        }
      }

      if (emailInput) emailInput.value = "";
      if (pwdInput) pwdInput.value = "";
      updateAuthUI();
      checkAuthGate();
      if (typeof switchTab === "function") {
        switchTab("home");
      }
      showToast(`Đăng nhập thành công! Chào mừng ${user.name} đến với Geography Edu.`, "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
    }
  }

  async function submitAuthGateRegister(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (window._isSubmittingGateReg) return;
    window._isSubmittingGateReg = true;

    const nameInput = document.getElementById("gate-reg-fullname");
    const emailInput = document.getElementById("gate-reg-email");
    const pwdInput = document.getElementById("gate-reg-password");
    const typeInput = document.getElementById("gate-reg-usertype");
    const submitBtn = document.getElementById("btn-gate-register-submit");

    const originalBtnContent = submitBtn ? submitBtn.innerHTML : "";
    let safetyTimer = null;

    try {
      const fullName = nameInput ? nameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";
      const password = pwdInput ? pwdInput.value : "";
      const userType = typeInput ? typeInput.value : "Học sinh THCS";

      if (!fullName || !email || !password) {
        showToast("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        showToast("Địa chỉ Gmail / Email không hợp lệ!", "error");
        return;
      }

      if (password.length < 6) {
        showToast("Mật khẩu phải có tối thiểu 6 ký tự!", "error");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Đang kiểm tra...</span>`;
        safetyTimer = setTimeout(() => {
          if (submitBtn && submitBtn.disabled) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
          }
        }, 3000);
      }

      // Kiểm tra xem tài khoản đã tồn tại trong danh sách thành viên hay chưa
      const emailLower = email.toLowerCase().trim();
      let emailExists = false;

      if (window.geoAuth && typeof window.geoAuth.getAllUsers === "function") {
        const allUsers = window.geoAuth.getAllUsers();
        if (allUsers.some(u => u && u.email && u.email.toLowerCase().trim() === emailLower)) {
          let isDeleted = false;
          try {
            const rawDel = localStorage.getItem("geo_deleted_emails");
            if (rawDel && JSON.parse(rawDel).includes(emailLower)) isDeleted = true;
          } catch(e) {}
          if (!isDeleted) emailExists = true;
        }
      }

      if (!emailExists) {
        try {
          const checkRes = await Promise.race([
            fetch(`/api/check-email?email=${encodeURIComponent(emailLower)}`, { cache: "no-store" }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), 1000))
          ]).catch(() => null);
          if (checkRes && checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData && checkData.exists) {
              let isDeleted = false;
              try {
                const rawDel = localStorage.getItem("geo_deleted_emails");
                if (rawDel && JSON.parse(rawDel).includes(emailLower)) isDeleted = true;
              } catch(e) {}
              if (!isDeleted) emailExists = true;
            }
          }
        } catch(e) {}
      }

      if (emailExists) {
        showToast("Tài khoản này đã có người sử dụng trong danh sách thành viên và không thể đăng ký! Vui lòng chọn địa chỉ Gmail khác hoặc đăng nhập.", "error");
        if (emailInput) emailInput.focus();
        return;
      }

      _pendingRegistrationData = { fullName, email, password, userType, source: "gate" };
      window._pendingRegistrationData = _pendingRegistrationData;
      switchAuthGateTab("robot");
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
      window._isSubmittingGateReg = false;
    }
  }

  async function submitModalRegister(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (window._isSubmittingModalReg) return;
    window._isSubmittingModalReg = true;

    const nameInput = document.getElementById("reg-fullname");
    const emailInput = document.getElementById("reg-email");
    const pwdInput = document.getElementById("reg-password");
    const typeInput = document.getElementById("reg-usertype");
    const submitBtn = document.getElementById("btn-register-submit");

    const originalBtnContent = submitBtn ? submitBtn.innerHTML : "";
    let safetyTimer = null;

    try {
      const fullName = nameInput ? nameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";
      const password = pwdInput ? pwdInput.value : "";
      const userType = typeInput ? typeInput.value : "Học sinh THCS";

      if (!fullName || !email || !password) {
        showToast("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        showToast("Địa chỉ Gmail / Email không hợp lệ!", "error");
        return;
      }

      if (password.length < 6) {
        showToast("Mật khẩu phải có tối thiểu 6 ký tự!", "error");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Đang kiểm tra...</span>`;
        safetyTimer = setTimeout(() => {
          if (submitBtn && submitBtn.disabled) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
          }
        }, 3000);
      }

      // Kiểm tra xem tài khoản đã tồn tại trong danh sách thành viên hay chưa
      const modalEmailLower = email.toLowerCase().trim();
      let modalEmailExists = false;

      if (window.geoAuth && typeof window.geoAuth.getAllUsers === "function") {
        const allUsers = window.geoAuth.getAllUsers();
        if (allUsers.some(u => u && u.email && u.email.toLowerCase().trim() === modalEmailLower)) {
          let isDeleted = false;
          try {
            const rawDel = localStorage.getItem("geo_deleted_emails");
            if (rawDel && JSON.parse(rawDel).includes(modalEmailLower)) isDeleted = true;
          } catch(e) {}
          if (!isDeleted) modalEmailExists = true;
        }
      }

      if (!modalEmailExists) {
        try {
          const checkRes = await Promise.race([
            fetch(`/api/check-email?email=${encodeURIComponent(modalEmailLower)}`, { cache: "no-store" }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), 1000))
          ]).catch(() => null);
          if (checkRes && checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData && checkData.exists) {
              let isDeleted = false;
              try {
                const rawDel = localStorage.getItem("geo_deleted_emails");
                if (rawDel && JSON.parse(rawDel).includes(modalEmailLower)) isDeleted = true;
              } catch(e) {}
              if (!isDeleted) modalEmailExists = true;
            }
          }
        } catch(e) {}
      }

      if (modalEmailExists) {
        showToast("Tài khoản này đã có người sử dụng trong danh sách thành viên và không thể đăng ký! Vui lòng chọn địa chỉ Gmail khác hoặc đăng nhập.", "error");
        if (emailInput) emailInput.focus();
        return;
      }

      _pendingRegistrationData = { fullName, email, password, userType, source: "modal" };
      window._pendingRegistrationData = _pendingRegistrationData;
      if (typeof closeModal === "function") closeModal("modal-register");
      if (typeof openModal === "function") openModal("modal-robot-verification");
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
      window._isSubmittingModalReg = false;
    }
  }

  function cancelGateRobotVerification() {
    _pendingRegistrationData = null;
    window._pendingRegistrationData = null;
    switchAuthGateTab("register");
    showToast("Đã quay lại form đăng ký tài khoản.", "info");
  }

  function cancelRobotVerification() {
    const isFromModal = window._pendingRegistrationData && window._pendingRegistrationData.source === "modal";
    _pendingRegistrationData = null;
    window._pendingRegistrationData = null;
    if (typeof closeModal === "function") closeModal("modal-robot-verification");
    if (isFromModal) {
      if (typeof openModal === "function") openModal("modal-register");
    } else {
      switchAuthGateTab("register");
    }
    showToast("Đã quay lại form đăng ký tài khoản.", "info");
  }

  async function handleRobotVerificationChoice(choice) {
    // 1. Phục hồi dữ liệu đăng ký nếu bị gián đoạn hoặc refresh
    let pending = window._pendingRegistrationData || _pendingRegistrationData;
    if (!pending) {
      const gateName = document.getElementById("gate-reg-fullname");
      const gateEmail = document.getElementById("gate-reg-email");
      const gatePwd = document.getElementById("gate-reg-password");
      const gateType = document.getElementById("gate-reg-usertype");

      const modalName = document.getElementById("reg-fullname");
      const modalEmail = document.getElementById("reg-email");
      const modalPwd = document.getElementById("reg-password");
      const modalType = document.getElementById("reg-usertype");

      if (gateName && gateName.value && gateEmail && gateEmail.value && gatePwd && gatePwd.value) {
        pending = {
          fullName: gateName.value.trim(),
          email: gateEmail.value.trim(),
          password: gatePwd.value,
          userType: gateType ? gateType.value : "Học sinh THCS",
          source: "gate"
        };
        window._pendingRegistrationData = pending;
        _pendingRegistrationData = pending;
      } else if (modalName && modalName.value && modalEmail && modalEmail.value && modalPwd && modalPwd.value) {
        pending = {
          fullName: modalName.value.trim(),
          email: modalEmail.value.trim(),
          password: modalPwd.value,
          userType: modalType ? modalType.value : "Học sinh THCS",
          source: "modal"
        };
        window._pendingRegistrationData = pending;
        _pendingRegistrationData = pending;
      }
    }

    if (!pending || !pending.email || !pending.password) {
      if (typeof closeModal === "function") closeModal("modal-robot-verification");
      switchAuthGateTab("register");
      showToast("Vui lòng nhập thông tin đăng ký hợp lệ trước khi xác thực!", "error");
      return;
    }

    const isFromModal = pending.source === "modal";

    // Đáp án 1 hoặc 3: "Có" hoặc "Chắc chắn có" => Người dùng nhận là robot => Từ chối đăng ký!
    if (choice === "yes" || choice === "definitely_yes") {
      if (typeof closeModal === "function") closeModal("modal-robot-verification");
      if (isFromModal) {
        if (typeof openModal === "function") openModal("modal-register");
      } else {
        switchAuthGateTab("register");
      }
      showToast("Bạn đã chọn là robot! Nếu bạn là con người, vui lòng chọn 'Không' để tiếp tục hoàn tất đăng ký.", "warning");
      return;
    }

    // Đáp án 2: "Không" => BẮT BUỘC TẠO TÀI KHOẢN VÀ CHUYỂN ĐẾN TRANG CHỦ
    if (choice === "no") {
      if (_isProcessingRobotVerification || window._isProcessingRobotVerification) return;
      _isProcessingRobotVerification = true;
      window._isProcessingRobotVerification = true;

      const allChoiceBtns = document.querySelectorAll(".robot-choice-btn, #btn-robot-answer-yes, #btn-robot-answer-no, #btn-robot-answer-definitely");
      const humanBtns = document.querySelectorAll(".robot-choice-btn.choice-human, #btn-robot-answer-no");
      const originalContents = new Map();

      allChoiceBtns.forEach(btn => {
        btn.disabled = true;
        btn.classList.add("disabled");
        btn.style.pointerEvents = "none";
      });

      humanBtns.forEach(btn => {
        originalContents.set(btn, btn.innerHTML);
        btn.classList.remove("disabled");
        btn.classList.add("btn-loading");
        btn.innerHTML = `
          <span class="robot-spinner" aria-hidden="true"></span>
          <span class="robot-choice-label" style="color: #0d9488;">Đang xác thực...</span>
          <span class="robot-choice-sub">Khởi tạo tài khoản và chuyển trang...</span>
        `;
      });

      let safetyResetTimer = setTimeout(() => {
        _isProcessingRobotVerification = false;
        window._isProcessingRobotVerification = false;
        allChoiceBtns.forEach(btn => {
          btn.disabled = false;
          btn.classList.remove("disabled", "btn-loading");
          btn.style.pointerEvents = "";
        });
        humanBtns.forEach(btn => {
          if (originalContents.has(btn)) btn.innerHTML = originalContents.get(btn);
        });
      }, 10000);

      try {
        let user = null;
        try {
          user = await window.geoAuth.register(pending);
        } catch (err) {
          console.warn("[AuthGateModule] Register exception:", err);

          const msg = (err && err.message) ? err.message : "Đăng ký không thành công. Vui lòng thử lại!";
          showToast(msg, "error");

          if (isFromModal) {
            if (typeof closeModal === "function") closeModal("modal-robot-verification");
            if (typeof openModal === "function") openModal("modal-register");
          } else {
            if (typeof closeModal === "function") closeModal("modal-robot-verification");
            switchAuthGateTab("register");
          }
          return;
        }

        if (!user) {
          showToast("Không thể hoàn tất đăng ký tài khoản. Vui lòng thử lại!", "error");
          return;
        }

        // Dọn dẹp form
        const nameInput = document.getElementById("gate-reg-fullname");
        const emailInput = document.getElementById("gate-reg-email");
        const pwdInput = document.getElementById("gate-reg-password");
        if (nameInput) nameInput.value = "";
        if (emailInput) emailInput.value = "";
        if (pwdInput) pwdInput.value = "";

        const regModalName = document.getElementById("reg-fullname");
        const regModalEmail = document.getElementById("reg-email");
        const regModalPwd = document.getElementById("reg-password");
        if (regModalName) regModalName.value = "";
        if (regModalEmail) regModalEmail.value = "";
        if (regModalPwd) regModalPwd.value = "";

        _pendingRegistrationData = null;
        window._pendingRegistrationData = null;

        // Đóng modal
        if (typeof closeAllModals === "function") {
          closeAllModals();
        } else {
          if (typeof closeModal === "function") {
            closeModal("modal-robot-verification");
            closeModal("modal-register");
          }
        }

        // Mở khóa Auth Gate
        const overlay = document.getElementById("auth-gate-overlay");
        if (overlay) {
          overlay.style.display = "none";
          overlay.classList.add("hidden");
        }
        document.documentElement.classList.remove("geo-guest-locked");
        document.documentElement.classList.add("geo-logged-in");
        document.body.style.overflow = "";

        if (typeof updateAuthUI === "function") updateAuthUI();
        if (typeof checkAuthGate === "function") checkAuthGate();

        // Chuyển trang chủ
        if (typeof switchTab === "function") {
          switchTab("home");
        }

        const homeTabLink = document.querySelector('.nav-link[data-tab="home"]');
        if (homeTabLink) homeTabLink.classList.add("active");
        const homeBottomLink = document.querySelector('.bottom-nav-item[data-tab="home"]');
        if (homeBottomLink) homeBottomLink.classList.add("active");

        const homeTabView = document.getElementById("tab-view-home");
        if (homeTabView) {
          document.querySelectorAll(".tab-view").forEach(v => v.classList.remove("active"));
          homeTabView.classList.add("active");
        }
        const heroSec = document.querySelector(".hero-section");
        if (heroSec) heroSec.style.display = "block";
        const mainCont = document.querySelector(".main-view-container");
        if (mainCont) mainCont.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });

        const userName = (user && user.name) ? user.name : "bạn";
        showToast(`Đăng ký tài khoản thành công! Chào mừng ${userName} đến với Geography Edu.`, "success");
      } finally {
        if (safetyResetTimer) clearTimeout(safetyResetTimer);
        _isProcessingRobotVerification = false;
        window._isProcessingRobotVerification = false;
        allChoiceBtns.forEach(btn => {
          btn.disabled = false;
          btn.classList.remove("disabled", "btn-loading");
          btn.style.pointerEvents = "";
        });
        humanBtns.forEach(btn => {
          if (originalContents.has(btn)) {
            btn.innerHTML = originalContents.get(btn);
          }
        });
      }
    }
  }

  function toggleMobileNav(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const navMenu = document.getElementById("nav-menu");
    const mobileToggle = document.getElementById("mobile-nav-toggle");
    const backdrop = document.getElementById("mobile-nav-backdrop");
    if (!navMenu) return;

    const isOpen = navMenu.classList.toggle("open");
    if (mobileToggle) {
      mobileToggle.classList.toggle("active", isOpen);
      mobileToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    if (backdrop) {
      backdrop.classList.toggle("show", isOpen);
    }
    document.body.classList.toggle("mobile-nav-open", isOpen);
  }

  function closeMobileNav() {
    const navMenu = document.getElementById("nav-menu");
    const mobileToggle = document.getElementById("mobile-nav-toggle");
    const backdrop = document.getElementById("mobile-nav-backdrop");
    if (navMenu) navMenu.classList.remove("open");
    if (mobileToggle) {
      mobileToggle.classList.remove("active");
      mobileToggle.setAttribute("aria-expanded", "false");
    }
    if (backdrop) {
      backdrop.classList.remove("show");
    }
    document.body.classList.remove("mobile-nav-open");
  }

  function updateAuthUI() {
    const user = window.geoAuth ? window.geoAuth.currentUser : null;
    const guestBox = document.getElementById("auth-guest-box");
    const userBox = document.getElementById("auth-user-box");
    const navAdminTab = document.getElementById("nav-link-admin");
    const mobileGuestActions = document.getElementById("nav-mobile-guest-actions");
    const mobileUserActions = document.getElementById("nav-mobile-user-actions");

    if (user) {
      if (guestBox) guestBox.style.display = "none";
      if (userBox) userBox.style.display = "flex";
      if (mobileGuestActions) mobileGuestActions.style.display = "none";
      if (mobileUserActions) mobileUserActions.style.display = "flex";

      const userNameEl = document.getElementById("auth-user-name");
      const userAvatarEl = document.getElementById("auth-user-avatar");
      const mobUserNameEl = document.getElementById("nav-mobile-user-name");
      const mobUserAvatarEl = document.getElementById("nav-mobile-user-avatar");

      if (userNameEl) userNameEl.textContent = user.name;
      if (userAvatarEl) userAvatarEl.textContent = user.name.charAt(0).toUpperCase();
      if (mobUserNameEl) mobUserNameEl.textContent = user.name;
      if (mobUserAvatarEl) mobUserAvatarEl.textContent = user.name.charAt(0).toUpperCase();

      const roleLabel = document.getElementById("auth-user-role");
      const mobRoleLabel = document.getElementById("nav-mobile-user-role");

      if (user.role === "admin") {
        const adminBadge = `<span class="admin-badge-indicator">Admin</span>`;
        if (roleLabel) roleLabel.innerHTML = adminBadge;
        if (mobRoleLabel) mobRoleLabel.innerHTML = adminBadge;
        if (navAdminTab) navAdminTab.style.display = "flex";
      } else {
        const userRoleText = user.userType || "Hoc sinh THCS";
        if (roleLabel) roleLabel.textContent = userRoleText;
        if (mobRoleLabel) mobRoleLabel.textContent = userRoleText;
        if (navAdminTab) navAdminTab.style.display = "none";
      }
    } else {
      if (guestBox) guestBox.style.display = "flex";
      if (userBox) userBox.style.display = "none";
      if (mobileGuestActions) mobileGuestActions.style.display = "flex";
      if (mobileUserActions) mobileUserActions.style.display = "none";
      if (navAdminTab) navAdminTab.style.display = "none";
    }
  }

  return {
    switchAuthGateTab,
    checkAuthGate,
    submitAuthGateLogin,
    submitAuthGateRegister,
    submitModalRegister,
    cancelGateRobotVerification,
    cancelRobotVerification,
    handleRobotVerificationChoice,
    toggleMobileNav,
    closeMobileNav,
    updateAuthUI
  };
})();

window.GeoAuthGateModule = GeoAuthGateModule;

// Export all Auth Gate & Verification functions immediately to window
// so inline HTML event handlers (onclick/onsubmit) never fail with ReferenceError
window.switchAuthGateTab = GeoAuthGateModule.switchAuthGateTab;
window.checkAuthGate = GeoAuthGateModule.checkAuthGate;
window.submitAuthGateLogin = GeoAuthGateModule.submitAuthGateLogin;
window.submitAuthGateRegister = GeoAuthGateModule.submitAuthGateRegister;
window.submitModalRegister = GeoAuthGateModule.submitModalRegister;
window.cancelGateRobotVerification = GeoAuthGateModule.cancelGateRobotVerification;
window.cancelRobotVerification = GeoAuthGateModule.cancelRobotVerification;
window.handleRobotVerificationChoice = GeoAuthGateModule.handleRobotVerificationChoice;
window.toggleMobileNav = GeoAuthGateModule.toggleMobileNav;
window.closeMobileNav = GeoAuthGateModule.closeMobileNav;
window.updateAuthUI = GeoAuthGateModule.updateAuthUI;
