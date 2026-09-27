/**
 * MODULE: UI & THEME CONTROLLER
 * Geography Edu - High School Help Kit
 * Quan ly che do sang/toi (Dark Mode), thong bao Toast, Modal popups va bo dem nguoc ky thi.
 */

const GeoUiThemeModule = (function () {
  let _countdownTimerInterval = null;

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-msg toast-${type}`;

    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === "error") {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- MODAL UTILITIES ---
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("show");
      const openModals = document.querySelectorAll(".modal-backdrop.show");
      const isGuestLocked = document.documentElement.classList.contains("geo-guest-locked");
      if (openModals.length === 0 && !isGuestLocked) {
        document.body.style.overflow = "";
      }
    }
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("show"));
    const isGuestLocked = document.documentElement.classList.contains("geo-guest-locked");
    if (!isGuestLocked) {
      document.body.style.overflow = "";
    }
  }

  // --- DARK MODE / NIGHT READING CONTROLLER ---
  function initTheme() {
    const savedTheme = localStorage.getItem("geo_theme") || "light";
    applyTheme(savedTheme, false);
  }

  function applyTheme(theme, showNotification = true) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    localStorage.setItem("geo_theme", isDark ? "dark" : "light");

    const sunIcon = document.querySelector(".theme-icon-sun");
    const moonIcon = document.querySelector(".theme-icon-moon");
    const toggleBtn = document.getElementById("btn-theme-toggle");

    if (sunIcon) sunIcon.style.display = isDark ? "block" : "none";
    if (moonIcon) moonIcon.style.display = isDark ? "none" : "block";

    if (toggleBtn) {
      toggleBtn.setAttribute("title", isDark ? (window.geoI18n ? window.geoI18n.t("themeToggleLight", "Chuyen sang che do ban ngay") : "Che do ban ngay") : (window.geoI18n ? window.geoI18n.t("themeToggleDark", "Chuyen sang che do ban dem") : "Che do ban dem"));
    }

    if (showNotification) {
      showToast(isDark ? "Da chuyen sang Che do ban dem" : "Da chuyen sang Che do ban ngay", "info");
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme, true);
  }

  // --- DYNAMIC EXAM COUNTDOWN CONTROLLER ---
  function initExamCountdown() {
    if (_countdownTimerInterval) clearInterval(_countdownTimerInterval);
    renderExamCountdown();
    _countdownTimerInterval = setInterval(renderExamCountdown, 1000);

    window.addEventListener("countdown_settings_changed", () => {
      renderExamCountdown();
    });
  }

  function renderExamCountdown() {
    if (!window.geoDB) return;
    const settings = window.geoDB.getCountdownSettings();
    const isAdmin = window.geoAuth && window.geoAuth.isAdmin();

    const adminActions = document.getElementById("countdown-admin-actions");
    if (adminActions) {
      adminActions.style.display = isAdmin ? "block" : "none";
    }

    const titleEl = document.getElementById("countdown-exam-title");
    const sloganEl = document.getElementById("countdown-exam-slogan");
    const targetDisplayEl = document.getElementById("countdown-target-display");

    if (titleEl) titleEl.textContent = settings.examName || "Ky Thi Tuyen Sinh Vao Lop 10 Nam 2027";
    if (sloganEl) sloganEl.textContent = settings.slogan || "Hay no luc tung ngay, canh cong truong Chuyen va THPT mo uoc dang rong mo cho don ban!";

    if (targetDisplayEl && settings.targetDate) {
      try {
        const d = new Date(settings.targetDate);
        const dateStr = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
        const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        targetDisplayEl.textContent = `${timeStr} - ${dateStr}`;
      } catch (e) {
        targetDisplayEl.textContent = settings.targetDate;
      }
    }

    const now = new Date().getTime();
    const targetTime = new Date(settings.targetDate || "2027-06-05T07:30:00").getTime();
    const diff = targetTime - now;

    const daysEl = document.getElementById("countdown-days");
    const hoursEl = document.getElementById("countdown-hours");
    const minsEl = document.getElementById("countdown-mins");
    const secsEl = document.getElementById("countdown-secs");

    if (diff <= 0) {
      if (daysEl) daysEl.textContent = "00";
      if (hoursEl) hoursEl.textContent = "00";
      if (minsEl) minsEl.textContent = "00";
      if (secsEl) secsEl.textContent = "00";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
    if (minsEl) minsEl.textContent = String(minutes).padStart(2, "0");
    if (secsEl) secsEl.textContent = String(seconds).padStart(2, "0");
  }

  function renderCountdownSettingsModal() {
    if (!window.geoDB) return;
    const settings = window.geoDB.getCountdownSettings();
    const nameInput = document.getElementById("countdown-config-exam-name");
    const dateInput = document.getElementById("countdown-config-target-date");
    const sloganInput = document.getElementById("countdown-config-slogan");

    if (nameInput) nameInput.value = settings.examName || "";
    if (dateInput) {
      try {
        const d = new Date(settings.targetDate);
        const pad = (n) => String(n).padStart(2, "0");
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        dateInput.value = formatted;
      } catch (e) {
        dateInput.value = settings.targetDate || "";
      }
    }
    if (sloganInput) sloganInput.value = settings.slogan || "";
    openModal("modal-countdown-config");
  }

  async function handleCountdownConfigSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameInput = document.getElementById("countdown-config-exam-name");
    const dateInput = document.getElementById("countdown-config-target-date");
    const sloganInput = document.getElementById("countdown-config-slogan");

    const newSettings = {
      examName: nameInput ? nameInput.value.trim() : "",
      targetDate: dateInput ? dateInput.value : "",
      slogan: sloganInput ? sloganInput.value.trim() : ""
    };

    if (!newSettings.examName || !newSettings.targetDate) {
      showToast("Vui long nhap day du ten ky thi va thoi diem!", "error");
      return;
    }

    try {
      await window.geoDB.saveCountdownSettings(newSettings);
      closeModal("modal-countdown-config");
      renderExamCountdown();
      showToast("Da cap nhat thoi gian dem nguoc ky thi thanh cong!", "success");
    } catch (err) {
      showToast("Loi khi luu cai dat dem nguoc: " + err.message, "error");
    }
  }

  return {
    showToast,
    openModal,
    closeModal,
    closeAllModals,
    initTheme,
    applyTheme,
    toggleTheme,
    initExamCountdown,
    renderExamCountdown,
    renderCountdownSettingsModal,
    handleCountdownConfigSubmit
  };
})();

window.GeoUiThemeModule = GeoUiThemeModule;
window.showToast = window.showToast || GeoUiThemeModule.showToast;
window.openModal = window.openModal || GeoUiThemeModule.openModal;
window.closeModal = window.closeModal || GeoUiThemeModule.closeModal;
window.closeAllModals = window.closeAllModals || GeoUiThemeModule.closeAllModals;
