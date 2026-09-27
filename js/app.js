/**
 * GEOGRAPHY EDU - MAIN APPLICATION CONTROLLER
 * High School Help Kit Project
 */

// Application State
const appState = {
  currentTab: "home",
  docFilter: {
    mainCat: "all",   // 'all', 'dai_cuong', 'viet_nam'
    subCat: "all",    // 'all', 'tu_nhien', 'kinh_te_xa_hoi'
    searchQuery: ""
  },
  cfsAdminFilter: "all", // 'all', 'unread', 'answered'
  selectedDocForRating: null,
  activePostEditTarget: null, // { type: 'hshk' | 'group', id: string | null }
  activeDocEditTargetId: null
};

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
    document.body.style.overflow = "";
  }
}

function closeAllModals() {
  document.querySelectorAll(".modal-backdrop").forEach(m => {
    if (m.id !== "modal-exam-room") {
      m.classList.remove("show");
    }
  });
  if (!document.getElementById("modal-exam-room")?.classList.contains("show")) {
    document.body.style.overflow = "";
  }
}

// ===== EXPOSE CRITICAL FUNCTIONS TO WINDOW (GLOBAL SCOPE) =====
// These must be available immediately for onclick attributes in index.html
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;

// Helper: Render Star SVG icons
function renderStars(ratingScore, interactive = false) {
  const score = Math.round(ratingScore || 5);
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= score;
    starsHtml += `
   <svg class="${isFilled ? 'star-filled' : 'star-empty'}" width="16" height="16" viewBox="0 0 24 24" fill="${isFilled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
   </svg>
  `;
  }
  return starsHtml;
}

// --- SEARCH HELPERS (cho nút gợi ý từ khóa & nút xóa) ---
function setDocSearch(query) {
  appState.docFilter.searchQuery = query;
  const input = document.getElementById("doc-search-input");
  if (input) input.value = query;
  const clearBtn = document.getElementById("doc-search-clear");
  if (clearBtn) clearBtn.style.display = query ? "flex" : "none";
  renderDocumentsView();
  // Scroll lên vùng kết quả
  const grid = document.getElementById("documents-grid");
  if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearDocSearch() {
  setDocSearch("");
  const input = document.getElementById("doc-search-input");
  if (input) input.focus();
}

// --- DOCUMENT SCROLL VIEW TOGGLE ---
function toggleDocScrollMode(wrapperId, btnEl) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;

  const isExpanded = wrapper.classList.toggle("expanded");
  if (btnEl) {
    if (isExpanded) {
      btnEl.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
    <span>Thu gọn cuộn</span>
   `;
      btnEl.setAttribute("title", "Chuyển về chế độ cuộn gọn gàng");
    } else {
      btnEl.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
    <span>Mở rộng toàn bộ</span>
   `;
      btnEl.setAttribute("title", "Mở rộng hiển thị toàn bộ");
    }
  }
}

// --- MULTI-LANGUAGE (i18n) CONTROLS ---
function toggleLanguageDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("lang-menu");
  if (menu) menu.classList.toggle("show");
}

function selectLanguage(langCode) {
  if (window.geoI18n) {
    window.geoI18n.setLanguage(langCode);
    const menu = document.getElementById("lang-menu");
    if (menu) menu.classList.remove("show");
    const langMeta = window.geoI18n.getLanguageMeta(langCode);
    showToast(`Đã chuyển sang ${langMeta.flag} ${langMeta.name}`, "info");
  }
}

// --- AUTO-TRANSLATE CONTENT (POSTS & DOCUMENTS) ---
function toggleAutoTranslateContent() {
  if (!window.geoI18n) return;
  const isEnabled = window.geoI18n.toggleAutoTranslate();
  const currentLang = window.geoI18n.getLang();
  const langMeta = window.geoI18n.getLanguageMeta(currentLang);

  const btn = document.getElementById("btn-toggle-auto-translate");
  const btnText = document.getElementById("auto-translate-btn-text");

  if (isEnabled) {
    showToast(` Đã bật tự động dịch nội dung sang ${langMeta.flag} ${langMeta.name}`, "success");
    if (btn) {
      btn.classList.add("active");
      btn.style.background = "var(--primary)";
      btn.style.color = "white";
    }
    if (btnText) btnText.textContent = t("btnAutoTranslateActive", "Đang bật tự động dịch");
  } else {
    showToast(` Đã chuyển về hiển thị nội dung gốc tiếng Việt`, "info");
    if (btn) {
      btn.classList.remove("active");
      btn.style.background = "transparent";
      btn.style.color = "var(--primary)";
    }
    if (btnText) btnText.textContent = t("btnAutoTranslate", "Dịch tự động (AI)");
  }
}

function toggleTranslateSinglePost(postId) {
  if (!appState.postTranslations) appState.postTranslations = {};
  const currentLang = window.geoI18n ? window.geoI18n.getLang() : "vi";

  if (currentLang === "vi") {
    showToast("Vui lòng chọn ngôn ngữ khác tiếng Việt ở góc trên để xem bản dịch!", "info");
    return;
  }

  appState.postTranslations[postId] = !appState.postTranslations[postId];
  renderHomeView();
  showToast(appState.postTranslations[postId] ? " Đã dịch bài viết!" : "Đã chuyển về bản gốc!", "success");
}

// Global click outside to close language menu
document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("lang-selector-dropdown");
  const menu = document.getElementById("lang-menu");
  if (menu && menu.classList.contains("show")) {
    if (!dropdown || !dropdown.contains(e.target)) {
      menu.classList.remove("show");
    }
  }
});

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
    toggleBtn.setAttribute("title", isDark ? (window.geoI18n ? window.geoI18n.t("themeToggleLight", "Chuyển sang chế độ ban ngày") : "Chế độ ban ngày") : (window.geoI18n ? window.geoI18n.t("themeToggleDark", "Chuyển sang chế độ ban đêm") : "Chế độ ban đêm"));
  }

  if (showNotification) {
    showToast(isDark ? "Đã chuyển sang Chế độ ban đêm" : "Đã chuyển sang Chế độ ban ngày", "info");
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme, true);
}

// --- DYNAMIC EXAM COUNTDOWN CONTROLLER ---
let _countdownTimerInterval = null;

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

  // Admin actions button
  const adminActions = document.getElementById("countdown-admin-actions");
  if (adminActions) {
    adminActions.style.display = isAdmin ? "block" : "none";
  }

  // Titles & slogans
  const titleEl = document.getElementById("countdown-exam-title");
  const sloganEl = document.getElementById("countdown-exam-slogan");
  const targetDisplayEl = document.getElementById("countdown-target-display");

  if (titleEl) titleEl.textContent = settings.examName || "Kỳ Thi Tuyển Sinh Vào Lớp 10 Năm 2027";
  if (sloganEl) sloganEl.textContent = settings.slogan || "Hãy nỗ lực từng ngày, cánh cổng trường Chuyên và THPT mơ ước đang rộng mở chờ đón bạn!";

  if (targetDisplayEl && settings.targetDate) {
    try {
      const d = new Date(settings.targetDate);
      const dateStr = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      targetDisplayEl.textContent = `Mục tiêu: ${dateStr} • ${timeStr}`;
    } catch (e) {
      targetDisplayEl.textContent = `Mục tiêu: ${settings.targetDate}`;
    }
  }

  const targetTs = settings.targetTimestamp || (settings.targetDate ? new Date(settings.targetDate).getTime() : 0);
  const now = Date.now();
  const diff = targetTs - now;

  const daysEl = document.getElementById("countdown-days");
  const hoursEl = document.getElementById("countdown-hours");

  if (diff <= 0) {
    if (daysEl) daysEl.textContent = "00";
    if (hoursEl) hoursEl.textContent = "00";
    if (sloganEl) sloganEl.textContent = window.geoI18n ? window.geoI18n.t("countdownTargetReached", "Kỳ thi đã diễn ra! Chúc các bạn làm bài thật xuất sắc!") : "Kỳ thi đã diễn ra!";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
  if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
}

function openCountdownConfigModal() {
  if (!window.geoAuth.isAdmin()) {
    showToast("Chỉ Quản trị viên mới có quyền cấu hình bộ đếm!", "error");
    return;
  }

  const settings = window.geoDB.getCountdownSettings();
  const nameInput = document.getElementById("countdown-input-name");
  const dateInput = document.getElementById("countdown-input-datetime");
  const sloganInput = document.getElementById("countdown-input-slogan");

  if (nameInput) nameInput.value = settings.examName || "";
  if (dateInput) dateInput.value = settings.targetDate || "";
  if (sloganInput) sloganInput.value = settings.slogan || "";

  openModal("modal-countdown-config");
}

async function submitCountdownConfig(e) {
  if (e && e.preventDefault) e.preventDefault();
  const nameInput = document.getElementById("countdown-input-name");
  const dateInput = document.getElementById("countdown-input-datetime");
  const sloganInput = document.getElementById("countdown-input-slogan");
  const submitBtn = document.getElementById("btn-save-countdown");

  const examName = nameInput ? nameInput.value.trim() : "";
  const targetDate = dateInput ? dateInput.value : "";
  const slogan = sloganInput ? sloganInput.value.trim() : "";

  if (!examName || !targetDate) {
    showToast("Vui lòng nhập đầy đủ tên kỳ thi và thời gian diễn ra!", "error");
    return;
  }

  const origText = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang lưu...";
  }

  try {
    await window.geoDB.saveCountdownSettings({ examName, targetDate, slogan }, window.geoAuth.currentUser);
    closeModal("modal-countdown-config");
    showToast("Đã cập nhật Bộ đếm thời gian thi thành công!", "success");
    renderExamCountdown();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
  }
}

// --- TAB ROUTING ---
function switchTab(tabName) {
  const isAuth = window.geoAuth && window.geoAuth.isAuthenticated();
  if (!isAuth) {
    checkAuthGate();
    return;
  }

  const isMaintActive = window.geoDB ? window.geoDB.isMaintenanceActive() : false;
  const isAdmin = window.geoAuth ? window.geoAuth.isAdmin() : false;

  // During maintenance, members are restricted from using AI and other features
  if (isMaintActive && !isAdmin && tabName === "ai-chat") {
    showToast("Trợ lý AI đang tạm khóa do hệ thống đang trong Chế độ Bảo trì!", "error");
  }

  appState.currentTab = tabName;


  // Update top nav links (highlight documents nav when on saved tab)
  document.querySelectorAll(".nav-link").forEach(link => {
    const linkTab = link.getAttribute("data-tab");
    if (linkTab === tabName || (tabName === "saved" && linkTab === "documents")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Update bottom nav links
  document.querySelectorAll(".bottom-nav-item").forEach(item => {
    const itemTab = item.getAttribute("data-tab");
    if (itemTab === tabName || (tabName === "saved" && itemTab === "documents")) {
      item.classList.add("active");
    } else if (itemTab) {
      item.classList.remove("active");
    }
  });

  // Update views
  document.querySelectorAll(".tab-view").forEach(view => {
    if (view.id === `tab-view-${tabName}`) {
      view.classList.add("active");
    } else {
      view.classList.remove("active");
    }
  });

  // Close mobile nav if open
  closeMobileNav();

  // Scroll to top of view
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Update top sticky maintenance warning banner
  updateMaintenanceUI();

  // Re-render corresponding view content
  if (tabName === "home") renderHomeView();
  else if (tabName === "documents") renderDocumentsView();
  else if (tabName === "saved") renderSavedDocumentsView();
  else if (tabName === "contact") renderContactView();
  else if (tabName === "ai-chat") {
    if (typeof initAiChat === "function") initAiChat();
  }
  else if (tabName === "admin-panel") renderAdminDashboard();

  // Handle Tab-specific page layouts (Globe, Hero banner, Footer, AI Chat)
  const heroSection = document.querySelector(".hero-section");
  const mainContainer = document.querySelector(".main-view-container");
  const footer = document.querySelector(".site-footer");
  const globeSection = document.getElementById("section-globe");

  if (tabName === "globe") {
    // Globe 3D Mode: ONLY show the 3D globe interactive viewport
    if (heroSection) heroSection.style.display = "none";
    if (mainContainer) mainContainer.style.display = "none";
    if (footer) footer.style.display = "none";
    if (globeSection) globeSection.style.display = "block";
  } else {
    // Normal tabs: restore main view and footer
    if (globeSection) globeSection.style.display = "none";
    if (mainContainer) mainContainer.style.display = "block";
    if (footer) footer.style.display = (tabName === "ai-chat") ? "none" : "block";
    if (heroSection) {
      heroSection.style.display = (tabName === "home") ? "block" : "none";
    }
  }

  // Init globe AFTER the section is visible (next frame so DOM layout is computed)
  if (tabName === "globe") {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        initGlobeTab();
        window.dispatchEvent(new Event("resize"));
      });
    });
  }
}
window.switchTab = switchTab;

// --- GLOBE 3D TAB CONTROLLER ---
function initGlobeTab() {
  // Wait for Three.js to be loaded (deferred script)
  if (typeof THREE === "undefined") {
    const globeCanvas = document.getElementById("globe-3d-canvas");
    if (globeCanvas) {
      globeCanvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;flex-direction:column;gap:12px;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><p style="margin:0;font-size:0.9rem;">Dang tai Three.js...</p></div>';
    }
    // Poll for Three.js
    let attempts = 0;
    const waitForThree = setInterval(function () {
      attempts++;
      if (typeof THREE !== "undefined") {
        clearInterval(waitForThree);
        _doInitGlobe();
      } else if (attempts > 60) {
        clearInterval(waitForThree);
        if (globeCanvas) {
          globeCanvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;">Khong the tai Three.js. Kiem tra ket noi mang.</div>';
        }
      }
    }, 500);
    return;
  }
  _doInitGlobe();
}

function _doInitGlobe() {
  if (!window.GlobeEngine) return;
  if (window.GlobeEngine.isInitialized()) return;

  // Safety check: ensure the container has valid dimensions before init
  const container = document.getElementById("globe-3d-canvas");
  if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
    // Retry after a short delay for browser layout to complete
    setTimeout(_doInitGlobe, 100);
    return;
  }

  // Initialize globe in the canvas container
  window.GlobeEngine.init("globe-3d-canvas");

  // Trigger resize so the renderer picks up the correct dimensions
  window.dispatchEvent(new Event("resize"));

  // Set current hour from real UTC time
  const nowUTC = new Date().getUTCHours();
  window.GlobeEngine.setDayNight(nowUTC);
  const hourSlider = document.getElementById("globe-slider-hour");
  const hourDisplay = document.getElementById("globe-hour-display");
  if (hourSlider) hourSlider.value = nowUTC;
  if (hourDisplay) hourDisplay.textContent = nowUTC + "h UTC";

  // Set default year
  const yearSlider = document.getElementById("globe-slider-year");
  if (yearSlider) yearSlider.value = 2024;
}

// Toggle mobile globe controls drawer
function toggleGlobeControls(forceState) {
  const panel = document.getElementById("globe-controls-panel");
  const btn = document.getElementById("globe-controls-toggle-btn");
  if (!panel) return;

  const shouldOpen = typeof forceState === "boolean" ? forceState : !panel.classList.contains("is-open");
  panel.classList.toggle("is-open", shouldOpen);
  if (btn) btn.classList.toggle("active", shouldOpen);
}
window.toggleGlobeControls = toggleGlobeControls;

// Globe view mode toggle (satellite <-> political map)
function globeSetMode(mode) {
  if (!window.GlobeEngine || !window.GlobeEngine.isInitialized()) return;
  window.GlobeEngine.setViewMode(mode);

  const btnSat = document.getElementById("globe-mode-btn-satellite");
  const btnMap = document.getElementById("globe-mode-btn-map");
  if (btnSat) btnSat.classList.toggle("active", mode === "satellite");
  if (btnMap) btnMap.classList.toggle("active", mode === "map");

  const daytimeGroup = document.getElementById("globe-group-daytime");
  if (daytimeGroup) daytimeGroup.style.display = mode === "satellite" ? "" : "none";

  const legend = document.getElementById("globe-map-legend");
  if (legend) legend.style.display = mode === "map" ? "" : "none";

  const themeGroup = document.getElementById("globe-map-theme-group");
  if (themeGroup) themeGroup.style.display = mode === "map" ? "" : "none";
}

// Map light/dark theme toggle
function globeSetMapTheme(theme) {
  if (!window.GlobeEngine || !window.GlobeEngine.isInitialized()) return;
  window.GlobeEngine.setMapTheme(theme);

  const btnLight = document.getElementById("globe-theme-btn-light");
  const btnDark  = document.getElementById("globe-theme-btn-dark");
  if (btnLight) btnLight.classList.toggle("active", theme === "light");
  if (btnDark)  btnDark.classList.toggle("active",  theme === "dark");
}

function openGlobeEditModal(countryCode) {
  const isAdmin = window.geoAuth && (window.geoAuth.isAdmin() || (window.geoAuth.isDeveloper && window.geoAuth.isDeveloper()));
  if (!isAdmin) { showToast("Chi Admin va Developer moi co quyen chinh sua so lieu!", "error"); return; }

  const data = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[countryCode];
  if (!data) { showToast("Khong tim thay du lieu quoc gia: " + countryCode, "error"); return; }

  const t = window.t || function (k, fb) { return fb; };
  const lang = window.geoI18n ? window.geoI18n.getLang() : "vi";
  const name = data.name[lang] || data.name.en;
  const year = window.GlobeEngine ? window.GlobeEngine.getSelectedYear() : 2024;

  const body = document.getElementById("globe-edit-modal-body");
  if (!body) return;

  body.innerHTML = `
    <div style="padding: 4px 0 16px; color: #94a3b8; font-size: 0.85rem;">
      ${t("globeEditHint", "Chinh sua so lieu hien thi cho nam")} <strong style="color: #06b6d4;">${year}</strong> - <strong>${name}</strong>
    </div>
    <form id="form-globe-edit" onsubmit="submitGlobeEdit(event, '${countryCode}', ${year})">
      <div class="form-group">
        <label class="form-label">Dan So (${year})</label>
        <input type="number" id="globe-edit-pop" class="form-control" value="${data.population[year] || ''}" placeholder="Vi du: 99462540">
      </div>
      <div class="form-group">
        <label class="form-label">GDP (${year}, ty USD)</label>
        <input type="number" step="0.01" id="globe-edit-gdp" class="form-control" value="${data.gdp[year] || ''}" placeholder="Vi du: 470.0">
      </div>
      <div class="form-group">
        <label class="form-label">GDP/Dau Nguoi (${year}, USD)</label>
        <input type="number" id="globe-edit-gdppc" class="form-control" value="${data.gdpPerCapita[year] || ''}" placeholder="Vi du: 4738">
      </div>
      <div class="form-group">
        <label class="form-label">Tang Truong GDP (%)</label>
        <input type="number" step="0.1" id="globe-edit-growth" class="form-control" value="${data.gdpGrowth}" placeholder="Vi du: 6.8">
      </div>
      <div class="form-group">
        <label class="form-label">Ti Le Do Thi Hoa (%)</label>
        <input type="number" step="0.1" id="globe-edit-urban" class="form-control" value="${data.urbanRate}" placeholder="Vi du: 38.5">
      </div>
      <div class="form-group">
        <label class="form-label">Tuoi Tho Trung Binh</label>
        <input type="number" step="0.1" id="globe-edit-life" class="form-control" value="${data.lifeExpectancy}" placeholder="Vi du: 73.7">
      </div>
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button type="submit" class="btn btn-primary" style="flex:1;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          ${t("globeEditSaveBtn", "Luu So Lieu")}
        </button>
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-globe-edit')">${t("btnCancel", "Huy")}</button>
      </div>
    </form>
  `;

  openModal("modal-globe-edit");
}

async function submitGlobeEdit(event, countryCode, year) {
  event.preventDefault();
  const isAdmin = window.geoAuth && (window.geoAuth.isAdmin() || (window.geoAuth.isDeveloper && window.geoAuth.isDeveloper()));
  if (!isAdmin) return;

  const pop = parseInt(document.getElementById("globe-edit-pop").value) || 0;
  const gdp = parseFloat(document.getElementById("globe-edit-gdp").value) || 0;
  const gdppc = parseInt(document.getElementById("globe-edit-gdppc").value) || 0;
  const growth = parseFloat(document.getElementById("globe-edit-growth").value) || 0;
  const urban = parseFloat(document.getElementById("globe-edit-urban").value) || 0;
  const life = parseFloat(document.getElementById("globe-edit-life").value) || 0;

  const overrideData = { year: year, population: pop, gdp: gdp, gdpPerCapita: gdppc, gdpGrowth: growth, urbanRate: urban, lifeExpectancy: life, updatedAt: Date.now() };

  try {
    // Save to Firestore (Admin only)
    if (window.geoDB && window.geoDB.setGlobeCountryOverride) {
      await window.geoDB.setGlobeCountryOverride(countryCode, overrideData);
    }

    // Apply to in-memory data for immediate display
    if (window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[countryCode]) {
      const c = window.GLOBE_COUNTRY_DATA[countryCode];
      if (pop) c.population[year] = pop;
      if (gdp) c.gdp[year] = gdp;
      if (gdppc) c.gdpPerCapita[year] = gdppc;
      if (growth) c.gdpGrowth = growth;
      if (urban) c.urbanRate = urban;
      if (life) c.lifeExpectancy = life;
    }

    showToast("Da luu so lieu thanh cong!", "success");
    closeModal("modal-globe-edit");
    // Refresh panel
    if (window.GlobeEngine) window.GlobeEngine.showCountryPanel(countryCode);
  } catch (err) {
    showToast("Loi luu so lieu: " + err.message, "error");
  }
}

// --- RENDER HOME VIEW ---
function renderHomeView() {
  const isAdmin = window.geoAuth.isAdmin();
  const currentLang = window.geoI18n ? window.geoI18n.getLang() : "vi";
  const isAutoTranslate = window.geoI18n ? window.geoI18n.autoTranslateEnabled : false;
  const isMaintActive = window.geoDB ? window.geoDB.isMaintenanceActive() : false;

  // Update maintenance UI banner
  updateMaintenanceUI();

  // 1. Render High School Help Kit Posts
  const hshkContainer = document.getElementById("hshk-posts-container");
  const hshkAdminControls = document.getElementById("hshk-admin-controls");
  if (hshkAdminControls) {
    hshkAdminControls.style.display = isAdmin ? "inline-flex" : "none";
  }

  // Khi đang bảo trì và không phải Admin: Ẩn bài viết, hiện thông báo bảo trì
  if (isMaintActive && !isAdmin) {
    if (hshkContainer) {
      hshkContainer.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1; padding: 36px 20px; background: rgba(245, 158, 11, 0.08); border: 1.5px dashed #f59e0b; border-radius: var(--radius-md); text-align: center;">
     <div style="font-size: 2.2rem; margin-bottom: 8px;"></div>
     <h4 style="margin-bottom: 6px; color: #b45309; font-weight: 700;">Bài viết tạm thời bị ẩn trong thời gian bảo trì</h4>
     <p style="color: #4b5563; font-size: 0.88rem; margin: 0;">Hệ thống đang tiến hành nâng cấp kỹ thuật. Bạn vẫn có thể tìm hiểu các thông tin chung tại trang chủ!</p>
    </div>
   `;
    }
  } else {
    const hshkPosts = window.geoDB.getHshkPosts();
    if (hshkContainer) {
      if (hshkPosts.length === 0) {
        hshkContainer.innerHTML = `<div class="empty-state"><p>${t("emptyHshkPosts", "Chưa có bài viết nào về High School Help Kit.")}</p></div>`;
      } else {
        hshkContainer.innerHTML = hshkPosts.map(post => {
          // Retrieve translated post data if auto-translate is on or individual post translated
          const postData = window.geoI18n ? window.geoI18n.getPostData(post) : post;
          const hasTranslation = window.geoI18n ? window.geoI18n.hasPostTranslation(post.id, currentLang) : false;
          const isPostTranslated = (hasTranslation || appState.postTranslations?.[post.id]) && currentLang !== "vi";

          return `
      <div class="post-card">
       <div>
        <div class="post-card-header">
         <h3 class="post-card-title">${escapeHtml(postData.title)}</h3>
         <div style="display: flex; gap: 6px; align-items: center;">
          ${isPostTranslated ? `<span class="badge" style="background: rgba(37,99,235,0.12); color:#2563eb; font-size:0.7rem;"> ${currentLang.toUpperCase()}</span>` : ''}
          <span class="badge badge-primary">${escapeHtml(postData.tag || 'Dự án')}</span>
         </div>
        </div>
        <div class="post-card-meta">
         <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${post.date}</span>
         <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${escapeHtml(postData.author || 'HSHK Team')}</span>
        </div>
        <div class="post-card-body">${escapeHtml(postData.content)}</div>
       </div>
       <div class="post-card-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <button class="btn btn-sm btn-outline-primary" onclick="toggleTranslateSinglePost('${post.id}')" title="Dịch bài viết này">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
         <span>${isPostTranslated ? t("btnOriginalContent", "Bản gốc") : t("btnTranslatePost", " Dịch bài")}</span>
        </button>
        ${isAdmin ? `
         <div class="post-admin-actions" style="margin-left: auto;">
          <button class="btn btn-sm btn-secondary" onclick="openEditPostModal('hshk', '${post.id}')">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> ${t("btnEdit", "Sửa")}
          </button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeletePost('hshk', '${post.id}')">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> ${t("btnDelete", "Xóa")}
          </button>
         </div>
        ` : ''}
       </div>
      </div>
     `;
        }).join("");
      }
    }
  }

  // 2. Render Group Địa Lí Posts
  const groupContainer = document.getElementById("group-posts-container");
  const groupAdminControls = document.getElementById("group-admin-controls");
  if (groupAdminControls) {
    groupAdminControls.style.display = isAdmin ? "inline-flex" : "none";
  }

  // Khi đang bảo trì và không phải Admin: Ẩn bài viết, hiện thông báo bảo trì
  if (isMaintActive && !isAdmin) {
    if (groupContainer) {
      groupContainer.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1; padding: 36px 20px; background: rgba(245, 158, 11, 0.08); border: 1.5px dashed #f59e0b; border-radius: var(--radius-md); text-align: center;">
     <div style="font-size: 2.2rem; margin-bottom: 8px;"></div>
     <h4 style="margin-bottom: 6px; color: #b45309; font-weight: 700;">Bài viết Group Địa Lí tạm thời bị ẩn trong thời gian bảo trì</h4>
     <p style="color: #4b5563; font-size: 0.88rem; margin: 0;">Ban quản trị đang cập nhật tài nguyên. Vui lòng quay lại sau khi chế độ bảo trì kết thúc!</p>
    </div>
   `;
    }
  } else {
    const groupPosts = window.geoDB.getGroupPosts();
    if (groupContainer) {
      if (groupPosts.length === 0) {
        groupContainer.innerHTML = `<div class="empty-state"><p>${t("emptyGroupPosts", "Chưa có bài viết nào trong Group Địa Lí.")}</p></div>`;
      } else {
        groupContainer.innerHTML = groupPosts.map(post => {
          const postData = window.geoI18n ? window.geoI18n.getPostData(post) : post;
          const hasTranslation = window.geoI18n ? window.geoI18n.hasPostTranslation(post.id, currentLang) : false;
          const isPostTranslated = (hasTranslation || appState.postTranslations?.[post.id]) && currentLang !== "vi";

          return `
      <div class="post-card">
       <div>
        <div class="post-card-header">
         <h3 class="post-card-title">${escapeHtml(postData.title)}</h3>
         <div style="display: flex; gap: 6px; align-items: center;">
          ${isPostTranslated ? `<span class="badge" style="background: rgba(37,99,235,0.12); color:#2563eb; font-size:0.7rem;"> ${currentLang.toUpperCase()}</span>` : ''}
          <span class="badge badge-secondary">${escapeHtml(postData.tag || 'Cộng đồng')}</span>
         </div>
        </div>
        <div class="post-card-meta">
         <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${post.date}</span>
         <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${escapeHtml(postData.author || 'Admin Group')}</span>
        </div>
        <div class="post-card-body">${escapeHtml(postData.content)}</div>
       </div>
       <div class="post-card-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <button class="btn btn-sm btn-outline-primary" onclick="toggleTranslateSinglePost('${post.id}')" title="Dịch bài viết này">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
         <span>${isPostTranslated ? t("btnOriginalContent", "Bản gốc") : t("btnTranslatePost", " Dịch bài")}</span>
        </button>
        ${isAdmin ? `
         <div class="post-admin-actions" style="margin-left: auto;">
          <button class="btn btn-sm btn-secondary" onclick="openEditPostModal('group', '${post.id}')">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> ${t("btnEdit", "Sửa")}
          </button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeletePost('group', '${post.id}')">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> ${t("btnDelete", "Xóa")}
          </button>
         </div>
        ` : ''}
       </div>
      </div>
     `;
        }).join("");
      }
    }
  }

  updateStatsCounters();
}

// --- UPDATE STATS COUNTERS (so lieu thuc te, khong so gia) ---
function updateStatsCounters() {
  const docs = window.geoDB.getDocuments();
  const totalDocsEl = document.getElementById("stat-total-docs");
  if (totalDocsEl) totalDocsEl.textContent = docs.length;

  // Tinh tong luot tai thuc te tu Firestore (khong cong so gia)
  const totalDownloads = docs.reduce((acc, curr) => acc + (Number(curr.downloads) || 0), 0);
  const totalDownloadsEl = document.getElementById("stat-total-downloads");
  if (totalDownloadsEl) totalDownloadsEl.textContent = totalDownloads.toLocaleString("vi-VN");

  // Tinh tong nguoi dung thuc te (khong tinh tai khoan nha phat trien)
  const DEV_EMAIL_STATS = "vut510624@gmail.com";
  const totalUsers = window.geoAuth.getAllUsers().filter(u => !u.email || u.email.toLowerCase() !== DEV_EMAIL_STATS).length;
  const totalUsersEl = document.getElementById("stat-total-users");
  if (totalUsersEl) totalUsersEl.textContent = totalUsers.toLocaleString("vi-VN");
}

// --- RENDER DOCUMENTS VIEW (WITH 2-TIER CATEGORIES) ---
function renderDocumentsView() {
  const isAdmin = window.geoAuth.isAdmin();
  const user = window.geoAuth.currentUser;
  const savedDocIds = user ? window.geoDB.getSavedDocIds(user.email) : [];
  const grid = document.getElementById("documents-grid");
  const adminAddDocBtn = document.getElementById("admin-add-doc-btn");

  if (adminAddDocBtn) {
    adminAddDocBtn.style.display = isAdmin ? "inline-flex" : "none";
  }

  let docs = window.geoDB.getDocuments();

  // Filter by Main Category
  if (appState.docFilter.mainCat !== "all") {
    docs = docs.filter(d => d.mainCat === appState.docFilter.mainCat);
  }

  // Filter by Sub Category
  if (appState.docFilter.subCat !== "all") {
    docs = docs.filter(d => d.subCat === appState.docFilter.subCat);
  }

  // Search Query
  if (appState.docFilter.searchQuery.trim()) {
    const q = appState.docFilter.searchQuery.toLowerCase().trim();
    docs = docs.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.desc.toLowerCase().includes(q) ||
      (d.grade && d.grade.toLowerCase().includes(q)) ||
      (d.author && d.author.toLowerCase().includes(q)) ||
      (d.tags && d.tags.toLowerCase().includes(q))
    );
  }

  // Hiển thị số kết quả tìm kiếm
  const resultBar = document.getElementById("doc-search-result-bar");
  const resultText = document.getElementById("doc-search-result-text");
  if (resultBar && resultText) {
    const hasSearch = appState.docFilter.searchQuery.trim() !== "";
    const hasCatFilter = appState.docFilter.mainCat !== "all" || appState.docFilter.subCat !== "all";
    if (hasSearch) {
      resultBar.style.display = "flex";
      resultBar.style.alignItems = "center";
      const q = appState.docFilter.searchQuery.trim();
      resultText.innerHTML = docs.length > 0
        ? ` Tìm thấy <strong>${docs.length}</strong> tài liệu với từ khóa "<strong>${escapeHtml(q)}</strong>"`
        : ` Không tìm thấy tài liệu nào với từ khóa "<strong>${escapeHtml(q)}</strong>"`;

      // Ghi nhan luot tim kiem thuc te cho cac tai lieu xuat hien trong ket qua
      if (docs.length > 0 && window.geoDB) {
        const docIds = docs.map(d => d.id);
        window.geoDB.recordDocSearch(docIds).catch(() => { });
      }
    } else if (hasCatFilter) {
      resultBar.style.display = "flex";
      resultBar.style.alignItems = "center";
      resultText.innerHTML = ` Hiển thị <strong>${docs.length}</strong> tài liệu trong danh mục đã chọn`;
    } else {
      resultBar.style.display = "none";
    }
  }

  // Update docs count in toolbar
  const docsCountText = document.getElementById("docs-count-text");
  const docsToolbar = document.getElementById("docs-view-toolbar");
  if (docsCountText) {
    docsCountText.textContent = `Tất cả tài liệu (${docs.length})`;
  }
  if (docsToolbar) {
    docsToolbar.style.display = docs.length > 0 ? "flex" : "none";
  }

  // Update auto-translate button UI in toolbar
  const autoTranslateBtn = document.getElementById("btn-toggle-auto-translate");
  const autoTranslateBtnText = document.getElementById("auto-translate-btn-text");
  const isAutoTranslate = window.geoI18n ? window.geoI18n.autoTranslateEnabled : false;
  const currentLang = window.geoI18n ? window.geoI18n.getLang() : "vi";
  const isMaintActive = window.geoDB ? window.geoDB.isMaintenanceActive() : false;

  if (autoTranslateBtn) {
    if (isAutoTranslate && currentLang !== "vi") {
      autoTranslateBtn.classList.add("active");
      autoTranslateBtn.style.background = "var(--primary)";
      autoTranslateBtn.style.color = "white";
      if (autoTranslateBtnText) autoTranslateBtnText.textContent = t("btnAutoTranslateActive", "Đang bật tự động dịch");
    } else {
      autoTranslateBtn.classList.remove("active");
      autoTranslateBtn.style.background = "transparent";
      autoTranslateBtn.style.color = "var(--primary)";
      if (autoTranslateBtnText) autoTranslateBtnText.textContent = t("btnAutoTranslate", "Dịch tự động (AI)");
    }
  }

  if (!grid) return;

  // Khi đang bảo trì và không phải Admin: Khóa danh sách tài liệu
  if (isMaintActive && !isAdmin) {
    grid.innerHTML = `
   <div class="empty-state" style="grid-column: 1 / -1; padding: 48px 24px; background: rgba(245, 158, 11, 0.08); border: 2px dashed #f59e0b; border-radius: var(--radius-lg); text-align: center;">
    <div style="font-size: 2.8rem; margin-bottom: 12px;"></div>
    <h3 style="color: #b45309; font-weight: 800; margin-bottom: 8px;">Kho Tài Liệu Đang Trong Thời Gian Bảo Trì</h3>
    <p style="color: #4b5563; max-width: 540px; margin: 0 auto 20px; line-height: 1.6;">Ban quản trị đang tiến hành nâng cấp & đồng bộ dữ liệu tài liệu. Bạn vẫn có thể truy cập Trang chủ!</p>
    <button class="btn btn-primary" onclick="switchTab('home')">Quay Về Trang Chủ</button>
   </div>
  `;
    return;
  }

  if (docs.length === 0) {
    const q = appState.docFilter.searchQuery.trim();
    grid.innerHTML = `
   <div class="empty-state">
    <div class="empty-state-icon">
     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    </div>
    <h3>Không tìm thấy tài liệu phù hợp</h3>
    <p>${q ? `Không có tài liệu nào khớp với "<strong>${escapeHtml(q)}</strong>". Thử từ khóa khác hoặc xóa bộ lọc.` : 'Thử chọn danh mục khác hoặc tìm kiếm với từ khóa khác.'}</p>
    ${q ? `<button class="btn btn-primary" style="margin-top: 12px;" onclick="clearDocSearch()"> Xóa tìm kiếm</button>` : ''}
   </div>
  `;
    return;
  }

  grid.innerHTML = docs.map(doc => {
    const isSaved = savedDocIds.includes(doc.id);
    const docData = window.geoI18n ? window.geoI18n.getDocumentData(doc) : doc;
    const hasTranslation = window.geoI18n ? window.geoI18n.hasDocTranslation(doc.id, currentLang) : false;
    const isTranslated = hasTranslation && currentLang !== "vi";

    const mainCatLabel = doc.mainCat === "dai_cuong" ? t("catDaiCuong", "Địa lí đại cương") : t("catVietNam", "Địa lí Việt Nam");
    const subCatLabel = doc.subCat === "tu_nhien" ? t("catTuNhien", "Tự nhiên") : t("catKinhTe", "Kinh tế - Xã hội");
    const isDirectLink = Boolean(doc.attachmentType === "link" || (doc.externalUrl && !doc.pdfBase64));

    let attachBadge = "";
    if (isDirectLink) {
      attachBadge = `<span class="badge" style="background: rgba(37,99,235,0.12); color:#2563eb;">Link ${doc.format || 'Online'}</span>`;
    } else if (doc.pdfBase64) {
      attachBadge = '<span class="badge badge-pdf-attached">File PDF</span>';
    }

    return `
   <div class="doc-card">
    <div>
     <div class="doc-card-top">
      ${getFormatIcon(doc.format, doc)}
      <div class="doc-meta-tags">
       ${isTranslated ? `<span class="badge" style="background: rgba(37,99,235,0.12); color:#2563eb; font-size:0.7rem;"> ${currentLang.toUpperCase()}</span>` : ''}
       <span class="badge badge-primary">${mainCatLabel}</span>
       <span class="badge badge-secondary">${subCatLabel}</span>
       ${attachBadge}
      </div>
     </div>
     
     <h3 class="doc-title">${escapeHtml(docData.title)}</h3>
     <p class="doc-desc">${escapeHtml(docData.desc || '')}</p>

     <div class="doc-meta-info">
      <div class="rating-stars" title="${doc.avgRating || 5.0} sao">
       ${renderStars(doc.avgRating)}
       <span class="rating-score-text">${(doc.avgRating || 5.0).toFixed(1)}</span>
       <span class="rating-count">(${doc.ratings ? doc.ratings.length : 1})</span>
      </div>
      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${doc.downloads || 0} ${t("downloadsCount", "lượt tải")}</span>
     </div>
    </div>

    <div>
     <div class="doc-card-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <button class="btn btn-sm btn-bookmark ${isSaved ? 'saved' : ''}" onclick="toggleSaveDocument('${doc.id}')">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
       <span>${isSaved ? t("btnSaved", "Đã lưu") : t("btnSave", "Lưu")}</span>
      </button>
      <button class="btn btn-sm btn-secondary" onclick="openDocumentCommentsModal('${doc.id}')" title="${t('commentsModalTitle', 'Xem bình luận & phản hồi')}">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
       <span>${t("btnCommentCount", "Bình luận")} (${doc.comments ? doc.comments.length : 0})</span>
      </button>
     </div>

     <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
      <button class="btn btn-sm btn-outline-primary" onclick="openRatingModal('${doc.id}')" title="${t('btnRate', 'Đánh giá')}">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
       <span>${t("btnRate", "Đánh giá")}</span>
      </button>
      <button class="btn btn-sm btn-primary" onclick="openDocumentPreview('${doc.id}')" title="${t('btnViewDoc', 'Xem & Tải')}">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
       <span>${isDirectLink ? 'Xem Link' : t('btnViewDoc', 'Xem & Tải')}</span>
      </button>
     </div>

     ${isAdmin ? `
      <div class="doc-admin-bar">
       <button class="btn btn-sm btn-secondary" onclick="openEditDocumentModal('${doc.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> ${t("btnEdit", "Sửa")}
       </button>
       <button class="btn btn-sm btn-danger" onclick="confirmDeleteDocument('${doc.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> ${t("btnDelete", "Xóa")}
       </button>
      </div>
     ` : ''}
    </div>
   </div>
  `;
  }).join("");

  // Update Exam Hub Admin/Dev UI controls
  if (typeof updateExamHubUI === "function") {
    updateExamHubUI();
  }
}

function getFormatBadgeClass(fmt) {
  const f = (fmt || "").toUpperCase();
  if (f === "PDF") return "type-pdf";
  if (f === "DOCX" || f === "DOC") return "type-docx";
  if (f === "SLIDES" || f === "PPT") return "type-slides";
  return "type-exam";
}

/**
 * Returns a styled SVG file-type icon for a given format label and doc attachment type.
 * PDF = red, DOCX = blue, Link = sky blue, SLIDES = orange.
 */
function getFormatIcon(fmt, doc) {
  const f = (fmt || "PDF").toUpperCase();
  const isDirectLink = Boolean(doc && (doc.attachmentType === "link" || (doc.externalUrl && !doc.pdfBase64)));

  if (isDirectLink) {
    if (f === "DOCX" || f === "DOC") {
      return `
    <div class="doc-file-icon" style="--file-color:#2563eb" title="Tài liệu Word DOCX (Liên kết trực tiếp)">
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="56">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" stroke="#2563eb" stroke-width="1.5"/>
      <polyline points="14 2 14 8 20 8" fill="none" stroke="#2563eb" stroke-width="1.5"/>
      <text x="12" y="17" text-anchor="middle" font-size="5" font-weight="700" fill="#2563eb" font-family="Arial,sans-serif">DOCX</text>
     </svg>
    </div>`;
    }
    return `
   <div class="doc-file-icon" style="--file-color:#0284c7" title="Liên kết tài liệu trực tuyến (Drive/Cloud)">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="56">
     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" stroke="#0284c7" stroke-width="1.5"/>
     <polyline points="14 2 14 8 20 8" fill="none" stroke="#0284c7" stroke-width="1.5"/>
     <text x="12" y="17" text-anchor="middle" font-size="4.5" font-weight="700" fill="#0284c7" font-family="Arial,sans-serif">LINK</text>
    </svg>
   </div>`;
  }

  if (f === "PDF") {
    return `
   <div class="doc-file-icon" style="--file-color:#ef4444" title="Tập tin PDF">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="56">
     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" stroke="#ef4444" stroke-width="1.5"/>
     <polyline points="14 2 14 8 20 8" fill="none" stroke="#ef4444" stroke-width="1.5"/>
     <text x="12" y="17" text-anchor="middle" font-size="5.5" font-weight="700" fill="#ef4444" font-family="Arial,sans-serif">PDF</text>
    </svg>
   </div>`;
  } else if (f === "DOCX" || f === "DOC") {
    return `
   <div class="doc-file-icon" style="--file-color:#2563eb" title="Tập tin Word DOCX">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="56">
     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" stroke="#2563eb" stroke-width="1.5"/>
     <polyline points="14 2 14 8 20 8" fill="none" stroke="#2563eb" stroke-width="1.5"/>
     <text x="12" y="17" text-anchor="middle" font-size="5" font-weight="700" fill="#2563eb" font-family="Arial,sans-serif">DOC</text>
    </svg>
   </div>`;
  } else if (f === "SLIDES" || f === "PPT") {
    return `
   <div class="doc-file-icon" style="--file-color:#f59e0b" title="Tài liệu Trình chiếu PPT">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="56">
     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" stroke="#f59e0b" stroke-width="1.5"/>
     <polyline points="14 2 14 8 20 8" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
     <text x="12" y="17" text-anchor="middle" font-size="5" font-weight="700" fill="#f59e0b" font-family="Arial,sans-serif">PPT</text>
    </svg>
   </div>`;
  } else {
    return `
   <div class="doc-file-icon" style="--file-color:#64748b">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="56">
     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" stroke="#64748b" stroke-width="1.5"/>
     <polyline points="14 2 14 8 20 8" fill="none" stroke="#64748b" stroke-width="1.5"/>
     <text x="12" y="17" text-anchor="middle" font-size="5" font-weight="700" fill="#64748b" font-family="Arial,sans-serif">${f.substring(0, 4)}</text>
    </svg>
   </div>`;
  }
}

// --- RENDER SAVED DOCUMENTS VIEW ---
function renderSavedDocumentsView() {
  const user = window.geoAuth.currentUser;
  const grid = document.getElementById("saved-documents-grid");
  const wrapper = document.getElementById("saved-documents-scroll-wrapper");
  const guestPrompt = document.getElementById("saved-guest-prompt");
  const toolbar = document.getElementById("saved-docs-view-toolbar");
  const countText = document.getElementById("saved-docs-count-text");

  if (!user) {
    if (grid) grid.style.display = "none";
    if (wrapper) wrapper.style.display = "none";
    if (toolbar) toolbar.style.display = "none";
    if (guestPrompt) guestPrompt.style.display = "block";
    return;
  }

  if (grid) grid.style.display = "grid";
  if (wrapper) wrapper.style.display = "block";
  if (guestPrompt) guestPrompt.style.display = "none";

  const savedIds = window.geoDB.getSavedDocIds(user.email);
  const allDocs = window.geoDB.getDocuments();
  const savedDocs = allDocs.filter(d => savedIds.includes(d.id));

  // Update badge counter in header
  updateSavedBadgeCounter();

  if (countText) {
    countText.textContent = `${t("navSaved", "Tài liệu đã lưu")} (${savedDocs.length})`;
  }
  if (toolbar) {
    toolbar.style.display = savedDocs.length > 0 ? "flex" : "none";
  }

  if (savedDocs.length === 0) {
    grid.innerHTML = `
   <div class="empty-state">
    <div class="empty-state-icon">
     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
    </div>
    <h3>${t("emptySaved", "Chưa có tài liệu nào được lưu")}</h3>
    <p>${t("emptySavedDesc", "Hãy khám phá kho tài liệu và bấm nút 'Lưu' để ghi nhớ các tài liệu yêu thích của bạn.")}</p>
    <button class="btn btn-primary" style="margin-top: 16px;" onclick="switchTab('documents')">${t("btnExploreDocs", "Khám phá Kho Tài Liệu")}</button>
   </div>
  `;
    return;
  }

  grid.innerHTML = savedDocs.map(doc => {
    const docData = window.geoI18n ? window.geoI18n.getDocumentData(doc) : doc;
    const mainCatLabel = doc.mainCat === "dai_cuong" ? t("catDaiCuong", "Địa lí đại cương") : t("catVietNam", "Địa lí Việt Nam");
    const subCatLabel = doc.subCat === "tu_nhien" ? t("catTuNhien", "Tự nhiên") : t("catKinhTe", "Kinh tế - Xã hội");
    const formatClass = getFormatBadgeClass(doc.format);

    return `
   <div class="doc-card">
    <div>
     <div class="doc-card-top">
      ${getFormatIcon(doc.format)}
      <div class="doc-meta-tags">
       <span class="badge badge-primary">${mainCatLabel}</span>
       <span class="badge badge-secondary">${subCatLabel}</span>
       ${doc.pdfBase64 ? '<span class="badge badge-pdf-attached">PDF</span>' : ''}
      </div>
     </div>
     
     <h3 class="doc-title">${escapeHtml(docData.title)}</h3>
     <p class="doc-desc">${escapeHtml(docData.desc || '')}</p>

     <div class="doc-meta-info">
      <div class="rating-stars">
       ${renderStars(doc.avgRating)}
       <span class="rating-score-text">${(doc.avgRating || 5.0).toFixed(1)}</span>
      </div>
      <span>${t("fileSize", "Dung lượng")}: ${doc.size || '3.5 MB'}</span>
     </div>
    </div>

    <div>
     <div class="doc-card-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <button class="btn btn-sm btn-bookmark saved" onclick="toggleSaveDocument('${doc.id}')">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
       <span>${t("btnRemoveSave", "Bỏ lưu")}</span>
      </button>
      <button class="btn btn-sm btn-secondary" onclick="openDocumentCommentsModal('${doc.id}')" title="${t('commentsModalTitle', 'Xem bình luận & phản hồi')}">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
       <span>${t("btnCommentCount", "Bình luận")} (${doc.comments ? doc.comments.length : 0})</span>
      </button>
     </div>

     <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
      <button class="btn btn-sm btn-outline-primary" onclick="openRatingModal('${doc.id}')" title="${t('btnRate', 'Đánh giá')}">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
       <span>${t("btnRate", "Đánh giá")}</span>
      </button>
      <button class="btn btn-sm btn-primary" onclick="openDocumentPreview('${doc.id}')">
       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
       <span>${t("btnViewDoc", "Xem & Tải")}</span>
      </button>
     </div>
    </div>
   </div>
  `;
  }).join("");
}

function updateSavedBadgeCounter() {
  const user = window.geoAuth ? (typeof window.geoAuth.getCurrentUser === "function" ? window.geoAuth.getCurrentUser() : window.geoAuth.currentUser) : null;
  const count = (user && window.geoDB) ? window.geoDB.getSavedDocIds(user.email).length : 0;

  document.querySelectorAll("#saved-badge-counter, .saved-badge-counter, #bottom-saved-badge-counter").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "inline-block" : "none";
  });
}

// --- RENDER CONTACT VIEW & CONFESSIONS ---
function renderContactView() {
  const isAdmin = window.geoAuth.isAdmin();
  const info = window.geoDB.getContactInfo();

  const adminEditBtn = document.getElementById("admin-edit-contact-btn");
  if (adminEditBtn) {
    adminEditBtn.style.display = isAdmin ? "inline-flex" : "none";
  }

  // Populate dynamic contact fields
  const elProjectName = document.getElementById("contact-display-project");
  if (elProjectName) elProjectName.textContent = info.project_name;

  const elSlogan = document.getElementById("contact-display-slogan");
  if (elSlogan) elSlogan.textContent = info.slogan;

  const elEmail = document.getElementById("contact-display-email");
  if (elEmail) elEmail.textContent = info.email;

  const elHotline = document.getElementById("contact-display-hotline");
  if (elHotline) elHotline.textContent = info.hotline;

  const elFanpage = document.getElementById("contact-display-fanpage");
  if (elFanpage) {
    elFanpage.textContent = info.fanpage_name;
    elFanpage.setAttribute("href", info.fanpage_url || "#");
  }

  const elGroup = document.getElementById("contact-display-group");
  if (elGroup) {
    elGroup.textContent = info.group_name;
    elGroup.setAttribute("href", info.group_url || "#");
  }

  const elAddress = document.getElementById("contact-display-address");
  if (elAddress) elAddress.textContent = info.address;

  const elHours = document.getElementById("contact-display-hours");
  if (elHours) elHours.textContent = info.work_hours;

  // Render Public Confessions & Q&A
  renderPublicConfessions();
}

// Render public confessions that have answers or are public
function renderPublicConfessions() {
  const container = document.getElementById("public-confessions-grid");
  if (!container) return;

  const confessions = window.geoDB.getConfessions();
  // Chỉ hiển thị câu hỏi đã được Admin trả lời
  const publicCfs = confessions.filter(c => c.reply);

  const toolbar = document.getElementById("public-cfs-toolbar");
  const countText = document.getElementById("public-cfs-count-text");
  if (countText) {
    countText.textContent = `Câu hỏi đã giải đáp (${publicCfs.length})`;
  }
  if (toolbar) {
    toolbar.style.display = publicCfs.length > 0 ? "flex" : "none";
  }

  if (publicCfs.length === 0) {
    container.innerHTML = `
   <div class="empty-state" style="grid-column: 1 / -1; padding: 32px 20px;">
    <div class="empty-state-icon" style="background: rgba(236, 72, 153, 0.1); color: #ec4899;">
     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
    </div>
    <h3>${t("emptyConfessions", "Chưa có câu hỏi nào được giải đáp")}</h3>
   </div>
  `;
    return;
  }

  container.innerHTML = publicCfs.map((cfs, idx) => {
    const sttDisplay = publicCfs.length - idx;

    const replyHtml = `
   <div class="confession-reply-box">
    <div class="confession-reply-header">
     <div class="confession-reply-admin">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"></path></svg>
      <span>${t("adminReplyLabel", "Admin trả lời")}: ${escapeHtml(cfs.replyBy || 'Admin')}</span>
     </div>
     <span style="font-size: 0.75rem; color: var(--text-muted);">${cfs.replyDate || ''}</span>
    </div>
    <div class="confession-reply-text">${escapeHtml(cfs.reply)}</div>
   </div>
  `;

    return `
   <div class="confession-card">
    <div>
     <div class="confession-header" style="margin-bottom: 10px;">
      <span style="font-weight: 700; color: var(--text-muted); font-size: 0.82rem;">#${sttDisplay}</span>
      <span style="font-size: 0.78rem; color: var(--text-muted);"> ${cfs.createdAt || ''}</span>
     </div>
     <p class="confession-body" style="margin: 0;">${escapeHtml(cfs.message)}</p>
    </div>
    ${replyHtml}
   </div>
  `;
  }).join("");
}

// --- RENDER ADMIN DASHBOARD ---
function renderAdminDashboard() {
  const isAdmin = window.geoAuth.isAdmin();
  const isSuperAdmin = window.geoAuth.isSuperAdmin();
  const nonAdminWarning = document.getElementById("admin-unauthorized-msg");
  const dashboardContent = document.getElementById("admin-dashboard-content");

  if (!isAdmin) {
    if (nonAdminWarning) nonAdminWarning.style.display = "block";
    if (dashboardContent) dashboardContent.style.display = "none";
    return;
  }

  if (nonAdminWarning) nonAdminWarning.style.display = "none";
  if (dashboardContent) dashboardContent.style.display = "block";

  // Super Admin Control Buttons visibility
  const superAdminControls = document.getElementById("super-admin-user-controls");
  if (superAdminControls) superAdminControls.style.display = isSuperAdmin ? "block" : "none";

  // Chi hien card Backup & Restore cho Super Admin (Admin Tong)
  const backupCard = document.getElementById("admin-backup-restore-card");
  if (backupCard) backupCard.style.display = isSuperAdmin ? "block" : "none";

  const actionColHeader = document.getElementById("admin-table-action-header");
  if (actionColHeader) actionColHeader.style.display = "table-cell";

  // Update Maintenance status card in dashboard
  updateMaintenanceUI();
  updateDeveloperControlsUI();

  // Summary counts
  const hshkCount = window.geoDB.getHshkPosts().length;
  const groupCount = window.geoDB.getGroupPosts().length;
  const docCount = window.geoDB.getDocuments().length;
  const allUsers = window.geoAuth.getAllUsers();
  // Không hiển thị tài khoản nhà phát triển trong danh sách thành viên
  const DEV_EMAIL = "vut510624@gmail.com";
  const visibleUsers = allUsers.filter(u => !u.email || u.email.toLowerCase() !== DEV_EMAIL);
  const userCount = visibleUsers.length;
  const allConfessions = window.geoDB.getConfessions();
  const cfsCount = allConfessions.length;

  // [SECURITY FIX VULN-07] Background remote user sync only for Admin users
  if (window.geoAuth && typeof window.geoAuth.fetchRemoteUsers === "function" && window.geoAuth.isAdmin() && !window._isFetchingRemoteUsers) {
    window._isFetchingRemoteUsers = true;
    window.geoAuth.fetchRemoteUsers().then(remoteUsers => {
      window._isFetchingRemoteUsers = false;
      const currentSignature = (visibleUsers || []).map(u => u.id + (u.email || '')).sort().join(',');
      const newSignature = (remoteUsers || []).filter(u => !u.email || u.email.toLowerCase() !== DEV_EMAIL).map(u => u.id + (u.email || '')).sort().join(',');
      if (currentSignature !== newSignature) {
        if (window.appState && window.appState.currentTab === "admin-panel") {
          renderAdminDashboard();
        }
      }
    }).catch(() => {
      window._isFetchingRemoteUsers = false;
    });
  }

  document.getElementById("adm-stat-hshk").textContent = hshkCount;
  document.getElementById("adm-stat-group").textContent = groupCount;
  document.getElementById("adm-stat-docs").textContent = docCount;
  document.getElementById("adm-stat-users").textContent = userCount;

  const elCfsStat = document.getElementById("adm-stat-cfs");
  if (elCfsStat) elCfsStat.textContent = cfsCount;

  // Breakdown of user accounts by target
  const thcsUsers = visibleUsers.filter(u => u.userType === "Học sinh THCS");
  const parentUsers = visibleUsers.filter(u => u.userType === "Phụ huynh");
  const otherUsers = visibleUsers.filter(u => u.userType === "Khác" || (!['Học sinh THCS', 'Phụ huynh', 'Admin'].includes(u.userType) && u.role !== 'admin'));
  const adminUsers = visibleUsers.filter(u => u.role === "admin" || (u.email && u.email.toLowerCase() === "hshk.project@gmail.com"));

  const elTotalUsers = document.getElementById("adm-stat-users-total");
  if (elTotalUsers) elTotalUsers.textContent = userCount;

  const elThcsUsers = document.getElementById("adm-stat-users-thcs");
  if (elThcsUsers) elThcsUsers.textContent = thcsUsers.length;

  const elParentUsers = document.getElementById("adm-stat-users-parent");
  if (elParentUsers) elParentUsers.textContent = parentUsers.length;

  const elOtherUsers = document.getElementById("adm-stat-users-other");
  if (elOtherUsers) elOtherUsers.textContent = otherUsers.length;

  const elAdminUsers = document.getElementById("adm-stat-users-admin");
  if (elAdminUsers) elAdminUsers.textContent = adminUsers.length;

  // Render Confessions list for Admin
  renderAdminConfessionsList();

  // Render Table of User Accounts (không hiển thị tài khoản nhà phát triển vut510624@gmail.com)
  const usersToolbarCount = document.getElementById("admin-users-toolbar-count");
  if (usersToolbarCount) {
    usersToolbarCount.textContent = `Danh sách thành viên (${visibleUsers.length})`;
  }

  const tableBody = document.getElementById("admin-users-table-body");
  if (tableBody) {
    if (visibleUsers.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 36px 16px;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="opacity: 0.5;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Chưa có tài khoản thành viên nào được ghi nhận trong hệ thống.</span>
            </div>
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = visibleUsers.map((user, idx) => {
      const isUserAdmin = user.role === "admin" || (user.email && user.email.toLowerCase() === "hshk.project@gmail.com");
      const isUserDelegated = Boolean(user.canToggleMaintenance);
      const isPasswordDelegated = Boolean(user.canViewPasswords);

      let roleBadge;
      if (isUserAdmin) {
        roleBadge = `
     <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
      <span class="badge badge-admin">${t("roleAdmin", "Quản trị viên")}</span>
      ${isUserDelegated ? `<span class="badge badge-delegated">Bảo Trì</span>` : ''}
      ${isPasswordDelegated ? `<span class="badge" style="background: rgba(139, 92, 246, 0.12); color: #7c3aed; font-size: 0.72rem; border: 1px solid rgba(139, 92, 246, 0.25);">Được xem MK</span>` : ''}
     </div>
    `;
      } else {
        roleBadge = `<span class="badge badge-secondary">${t("userRoleDefault", "Thành viên")}</span>`;
      }

      let userTypeLabel = user.userType || 'Học sinh THCS';
      if (user.userType === "Học sinh THCS") userTypeLabel = t("roleStudent", "Học sinh THCS");
      else if (user.userType === "Phụ huynh") userTypeLabel = t("roleParent", "Phụ huynh");
      else if (user.userType === "Khác") userTypeLabel = t("roleOther", "Khác");

      let userTypeBadge = `<span class="badge badge-primary">${escapeHtml(userTypeLabel)}</span>`;
      if (user.userType === "Phụ huynh") userTypeBadge = `<span class="badge badge-accent">${escapeHtml(userTypeLabel)}</span>`;
      else if (user.userType === "Khác") userTypeBadge = `<span class="badge badge-secondary">${escapeHtml(userTypeLabel)}</span>`;

      const isCurrentUser = window.geoAuth.currentUser && window.geoAuth.currentUser.email && user.email && (user.email.toLowerCase() === window.geoAuth.currentUser.email.toLowerCase());
      const attemptInfo = window.geoAuth ? window.geoAuth.getAttemptData(user.email) : null;
      const isLocked = Boolean(user.isLocked || user.status === "locked_bruteforce" || (attemptInfo && (attemptInfo.isPermanentlyLocked || (attemptInfo.lockUntil && attemptInfo.lockUntil > Date.now()))));

      // Status badge
      let statusBadgeHtml = `<span class="user-status-active">${t("statusActive", "Hoạt động")}</span>`;
      if (isLocked) {
        statusBadgeHtml = `<span class="badge" style="background: #ef4444; color: white; font-size: 0.76rem; font-weight: 700;">Bị khóa (Dò pass)</span>`;
      }

      // Password Column Computation (Chỉ Super Admin hoặc Admin được ủy quyền mới xem được)
      const canView = window.geoAuth ? window.geoAuth.canViewPasswords() : false;
      const pwdData = window.geoAuth ? window.geoAuth.getUserDisplayPassword(user) : { type: "plain", value: user.password || "••••••••", masked: "••••••••" };
      let passwordCellHtml = "";
      if (!canView || pwdData.type === "restricted") {
        passwordCellHtml = `
      <td style="text-align: center; vertical-align: middle;">
        <span class="badge" style="background: rgba(100, 116, 139, 0.08); color: #64748b; font-size: 0.75rem; border: 1px solid rgba(100, 116, 139, 0.2); display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;" title="Chỉ Admin Tổng hoặc Admin được ủy quyền mới có thể xem">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Cần ủy quyền
        </span>
      </td>`;
      } else if (pwdData.type === "oauth") {
        passwordCellHtml = `
      <td style="text-align: center; vertical-align: middle;">
        <span class="badge" style="background: rgba(66, 133, 244, 0.1); color: #2563eb; font-size: 0.75rem; border: 1px solid rgba(66, 133, 244, 0.25); display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-weight: 600;">
          <svg width="12" height="12" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
          Google OAuth
        </span>
      </td>`;
      } else if (pwdData.type === "plain" || pwdData.type === "hash") {
        passwordCellHtml = `
      <td style="text-align: center; vertical-align: middle;">
        <div class="admin-password-box" id="pwd-box-${user.id}" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.04); padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border-color, #e2e8f0); max-width: 170px;">
          <span class="user-pwd-text" id="pwd-text-${user.id}" data-full="•••••••• (Đã bảo vệ PBKDF2)" data-masked="•••••••• (Bảo mật)" style="font-family: monospace; font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 95px;" title="Mật khẩu được mã hóa an toàn">•••••••• (Bảo mật)</span>
          <button type="button" class="btn btn-sm btn-ghost btn-pwd-action" style="padding: 2px 4px; line-height: 1; color: var(--text-muted); cursor: pointer;" onclick="toggleUserPasswordVisibility('${user.id}')" title="Kiểm tra trạng thái bảo mật">
            <span id="pwd-icon-${user.id}">Xem</span>
          </button>
          <button type="button" class="btn btn-sm btn-ghost btn-pwd-action" style="padding: 2px 4px; line-height: 1; color: var(--text-muted); cursor: pointer;" onclick="copyUserPassword('${user.id}')" title="Sao chép trạng thái bảo mật">
            Copy
          </button>
        </div>
      </td>`;
      } else {
        passwordCellHtml = `<td style="text-align: center; color: var(--text-muted); font-size: 0.82rem;">—</td>`;
      }

      // Actions Column: Super Admin has full management; Standard Admin can delete regular members only (cannot delete admins)
      let actionCellHtml = "";
      if (isCurrentUser) {
        actionCellHtml = `<td style="text-align: center;"><span style="font-size: 0.8rem; color: var(--primary); font-weight: 700; background: rgba(13, 148, 136, 0.08); padding: 4px 8px; border-radius: 4px;">${t("youCurrentUser", "Bạn (Đang đăng nhập)")}</span></td>`;
      } else if (isSuperAdmin) {
        if (isUserAdmin) {
          actionCellHtml = `
      <td style="text-align: center;">
       <div style="display: inline-flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-sm btn-outline-info" style="padding: 4px 8px; font-size: 0.78rem; border-color: #0284c7; color: #0284c7;" title="Truy cập và xem giao diện với tư cách tài khoản này" onclick="handleImpersonateUser('${user.id}', '${escapeHtml(user.email)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          <span>Truy cập</span>
        </button>
        ${isLocked ? `<button class="btn btn-sm btn-outline-success" style="padding: 4px 8px; font-size: 0.78rem;" title="Mở khóa tài khoản này" onclick="handleUnlockUserAccount('${user.id}', '${escapeHtml(user.email)}')">Mở khóa</button>` : ''}
        ${isUserDelegated ? `<button class="btn btn-sm btn-outline-danger" style="padding: 4px 8px; font-size: 0.78rem;" title="Thu hồi quyền bật/tắt bảo trì" onclick="handleToggleMaintenanceDelegation('${user.id}', '${escapeHtml(user.email)}', false)">Thu hồi bảo trì</button>` : `<button class="btn btn-sm btn-outline-primary" style="padding: 4px 8px; font-size: 0.78rem;" title="Ủy quyền bật/tắt bảo trì cho tài khoản này" onclick="handleToggleMaintenanceDelegation('${user.id}', '${escapeHtml(user.email)}', true)">Ủy quyền bảo trì</button>`}
        ${isPasswordDelegated ? `<button class="btn btn-sm btn-outline-danger" style="padding: 4px 8px; font-size: 0.78rem;" title="Thu hồi quyền xem mật khẩu của tài khoản Admin này" onclick="handleTogglePasswordDelegation('${user.id}', '${escapeHtml(user.email)}', false)">Thu hồi xem MK</button>` : `<button class="btn btn-sm" style="padding: 4px 8px; font-size: 0.78rem; background: rgba(139, 92, 246, 0.1); color: #7c3aed; border: 1px solid rgba(139, 92, 246, 0.3);" title="Ủy quyền xem mật khẩu cho tài khoản Admin này" onclick="handleTogglePasswordDelegation('${user.id}', '${escapeHtml(user.email)}', true)">Ủy quyền xem MK</button>`}
        <button class="btn btn-sm btn-outline-secondary" style="padding: 4px 8px; font-size: 0.78rem;" title="Đặt lại mật khẩu thành viên" onclick="openAdminResetPasswordModal('${user.id}', '${escapeHtml(user.email)}', '${escapeHtml(user.name)}')">
          <span>Đổi MK</span>
        </button>
        <button class="btn btn-sm btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;" title="${t('btnDemoteAdmin', 'Hạ quyền')}" onclick="handleDemoteAdmin('${user.id}', '${escapeHtml(user.email)}')">
         <span>${t("btnDemoteAdmin", "Hạ quyền")}</span>
        </button>
        <button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 0.78rem;" title="${t('btnDeleteAccount', 'Xóa')}" onclick="handleDeleteUserAccount('${user.id}', '${escapeHtml(user.email)}')">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
         <span>${t("btnDeleteAccount", "Xóa")}</span>
        </button>
       </div>
      </td>
     `;
        } else {
          actionCellHtml = `
      <td style="text-align: center;">
       <div style="display: inline-flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-sm btn-outline-info" style="padding: 4px 8px; font-size: 0.78rem; border-color: #0284c7; color: #0284c7;" title="Truy cập và xem giao diện với tư cách tài khoản này" onclick="handleImpersonateUser('${user.id}', '${escapeHtml(user.email)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          <span>Truy cập</span>
        </button>
        ${isLocked ? `
         <button class="btn btn-sm btn-outline-success" style="padding: 4px 8px; font-size: 0.78rem;" title="Mở khóa tài khoản này" onclick="handleUnlockUserAccount('${user.id}', '${escapeHtml(user.email)}')">
           Mở khóa
         </button>
        ` : ''}
        <button class="btn btn-sm btn-outline-secondary" style="padding: 4px 8px; font-size: 0.78rem;" title="Đặt lại mật khẩu thành viên" onclick="openAdminResetPasswordModal('${user.id}', '${escapeHtml(user.email)}', '${escapeHtml(user.name)}')">
          <span>Đổi MK</span>
        </button>
        <button class="btn btn-sm btn-outline-primary" style="padding: 4px 8px; font-size: 0.78rem;" title="${t('btnPromoteAdmin', 'Thăng Admin')}" onclick="handlePromoteAdmin('${user.id}', '${escapeHtml(user.email)}')">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
         <span>${t("btnPromoteAdmin", "Thăng Admin")}</span>
        </button>
        <button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 0.78rem;" title="${t('btnDeleteAccount', 'Xóa')}" onclick="handleDeleteUserAccount('${user.id}', '${escapeHtml(user.email)}')">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
         <span>${t("btnDeleteAccount", "Xóa")}</span>
        </button>
       </div>
      </td>
     `;
        }
      } else {
        // Logged in as standard Admin
        if (isUserAdmin) {
          actionCellHtml = `<td style="text-align: center;"><span class="badge badge-admin" style="font-size: 0.76rem; opacity: 0.85;">${t("roleAdmin", "Quản trị viên")}</span></td>`;
        } else {
          actionCellHtml = `
      <td style="text-align: center;">
       <div style="display: inline-flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
        ${isLocked ? `
         <button class="btn btn-sm btn-outline-success" style="padding: 4px 8px; font-size: 0.78rem;" title="Mở khóa tài khoản này" onclick="handleUnlockUserAccount('${user.id}', '${escapeHtml(user.email)}')">
           Mở khóa
         </button>
        ` : ''}
        <button class="btn btn-sm btn-outline-secondary" style="padding: 4px 8px; font-size: 0.78rem;" title="Đặt lại mật khẩu thành viên" onclick="openAdminResetPasswordModal('${user.id}', '${escapeHtml(user.email)}', '${escapeHtml(user.name)}')">
          <span>Đổi MK</span>
        </button>
        <button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 0.78rem;" title="${t('btnDeleteAccount', 'Xóa')}" onclick="handleDeleteUserAccount('${user.id}', '${escapeHtml(user.email)}')">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
         <span>${t("btnDeleteAccount", "Xóa")}</span>
        </button>
       </div>
      </td>
     `;
        }
      }

      return `
    <tr>
     <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
     <td>
      <div style="display: flex; align-items: center; gap: 10px;">
       <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.75rem;">${(user.name || 'U').charAt(0).toUpperCase()}</div>
       <strong style="color: var(--text-main);">${escapeHtml(user.name)}</strong>
      </div>
     </td>
     <td><code>${escapeHtml(user.email)}</code></td>
     ${passwordCellHtml}
     <td>${userTypeBadge}</td>
     <td>${roleBadge}</td>
     <td>${user.createdAt || '2026'}</td>
     <td>${statusBadgeHtml}</td>
     ${actionCellHtml}
    </tr>
   `;
    }).join("");
    }
  }

  // Render Blocked Emails (Blacklist), Security Logs, Telemetry & Analytics
  renderAdminBlockedEmailsList();
  renderAdminSecurityLogs();
  renderAdminTelemetryLogs();
  renderAdminAnalytics();

  // Update Sub-Navbar Badges & Super Admin Nav Items
  const badgeCfs = document.getElementById("adm-nav-badge-cfs");
  if (badgeCfs) {
    const unreadCount = allConfessions.filter(c => !c.status || c.status === "unread").length;
    badgeCfs.textContent = unreadCount > 0 ? unreadCount : cfsCount;
    badgeCfs.style.display = cfsCount > 0 ? "inline-flex" : "none";
  }

  const badgeUsers = document.getElementById("adm-nav-badge-users");
  if (badgeUsers) {
    badgeUsers.textContent = userCount;
  }

  const badgeBlocked = document.getElementById("adm-nav-badge-blocked");
  if (badgeBlocked && window.geoDB) {
    const blockedCount = window.geoDB.getBlockedEmails().length;
    badgeBlocked.textContent = blockedCount;
    badgeBlocked.style.display = blockedCount > 0 ? "inline-flex" : "none";
  }

  const backupNavBtn = document.getElementById("adm-nav-btn-backup");
  if (backupNavBtn) {
    backupNavBtn.style.display = isSuperAdmin ? "inline-flex" : "none";
  }

  // Sync active admin sub-tab
  switchAdminTab(appState.adminSubTab || "overview");
}

// --- ADMIN SUB-NAVBAR TAB SWITCHER ---
function switchAdminTab(subTabName) {
  if (!subTabName) subTabName = "overview";
  appState.adminSubTab = subTabName;

  // Update button active states
  const buttons = document.querySelectorAll(".admin-sub-nav-btn");
  buttons.forEach(btn => {
    if (btn.getAttribute("data-admin-tab") === subTabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Toggle admin section panes
  const allPanes = document.querySelectorAll(".admin-section-pane");
  allPanes.forEach(pane => {
    if (subTabName === "all") {
      pane.style.display = "block";
    } else if (pane.id === `admin-pane-${subTabName}`) {
      pane.style.display = "block";
    } else {
      pane.style.display = "none";
    }
  });
}

// --- ADMIN UNLOCK USER CONTROLLER ---
async function handleUnlockUserAccount(userId, userEmail) {
  try {
    if (!window.geoAuth) return;
    await window.geoAuth.unlockUserAccount(userId, userEmail);
    showToast(`Đã mở khóa tài khoản ${userEmail} thành công! Số lần thử mật khẩu đã được đặt lại.`, "success");
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- ADMIN BLOCKED EMAILS (BLACKLIST) CONTROLLERS ---
function renderAdminBlockedEmailsList() {
  const tableBody = document.getElementById("admin-blocked-emails-table-body");
  if (!tableBody) return;

  const blockedList = window.geoDB ? window.geoDB.getBlockedEmails() : [];
  if (blockedList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.5;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>Hiện chưa có địa chỉ Gmail nào trong danh sách đen (Blacklist).</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = blockedList.map((item, idx) => {
    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 800; font-size: 0.72rem;">BLOCKED</span>
            <code style="font-weight: 700; color: #ef4444;">${escapeHtml(item.email)}</code>
          </div>
        </td>
        <td style="color: var(--text-main);">${escapeHtml(item.reason || 'Vi phạm quy định')}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(item.blockedAt || '2026')}</td>
        <td><span class="badge badge-secondary" style="font-size: 0.76rem;">${escapeHtml(item.blockedBy || 'Quản trị viên')}</span></td>
        <td style="text-align: center;">
          <button class="btn btn-sm btn-outline-success" style="padding: 4px 10px; font-size: 0.78rem; font-weight: 700;" title="Bỏ chặn email này" onclick="handleUnblockEmail('${item.id}', '${escapeHtml(item.email)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Bỏ Chặn</span>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

async function handleBlockAndPurgeUser(userId, userEmail) {
  if (!confirm(` CẢNH BÁO NGUY HIỂM:\nBạn có chắc chắn muốn CHẶN EMAIL và XÓA VĨNH VIỄN tài khoản ${userEmail} khỏi hệ thống không?\n\n- Tài khoản sẽ lập tức bị xóa và đăng xuất ngay lập tức.\n- Gmail này sẽ bị chặn vĩnh viễn không thể đăng nhập hoặc đăng ký lại!`)) {
    return;
  }

  const reason = prompt(`Nhập lý do chặn tài khoản ${userEmail}:`, "Vi phạm quy định sử dụng") || "Bị chặn bởi Quản trị viên";

  try {
    await window.geoDB.blockEmail({
      email: userEmail,
      reason: reason,
      adminUser: window.geoAuth.currentUser
    });
    showToast(` Đã chặn Gmail ${userEmail} và xóa sạch tài khoản khỏi hệ thống!`, "success");
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleManualBlockEmail(e) {
  if (e && e.preventDefault) e.preventDefault();
  const inputEmail = document.getElementById("manual-block-email");
  const inputReason = document.getElementById("manual-block-reason");
  const email = inputEmail ? inputEmail.value.trim() : "";
  const reason = inputReason ? inputReason.value.trim() : "";

  if (!email) {
    showToast("Vui lòng nhập địa chỉ Gmail cần chặn!", "error");
    return;
  }

  if (!confirm(`Xác nhận chặn Gmail ${email} và xóa vĩnh viễn mọi dữ liệu liên quan?`)) {
    return;
  }

  try {
    await window.geoDB.blockEmail({
      email: email,
      reason: reason || "Chặn thủ công bởi Quản trị viên",
      adminUser: window.geoAuth.currentUser
    });
    if (inputEmail) inputEmail.value = "";
    if (inputReason) inputReason.value = "";
    showToast(` Đã đưa Gmail ${email} vào Blacklist và xóa sạch dữ liệu liên quan!`, "success");
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleUnblockEmail(docId, userEmail) {
  if (!confirm(`Bạn có chắc chắn muốn BỎ CHẶN cho địa chỉ Gmail ${userEmail} không?`)) {
    return;
  }

  try {
    await window.geoDB.unblockEmail(docId, window.geoAuth.currentUser);
    showToast(` Đã gỡ bỏ chặn cho ${userEmail} thành công! Người dùng hiện có thể đăng ký / đăng nhập lại.`, "success");
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- ADMIN SECURITY INCIDENTS / BRUTE FORCE LOGS ---
async function renderAdminSecurityLogs() {
  const tableBody = document.getElementById("admin-security-logs-body");
  if (!tableBody) return;

  try {
    const incidents = window.geoAuth ? await window.geoAuth.getSecurityIncidents() : [];
    if (!incidents || incidents.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Hệ thống an toàn. Chưa ghi nhận vụ việc dò mật khẩu nào.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = incidents.map((inc, idx) => {
      const timeStr = inc.timestamp ? new Date(inc.timestamp).toLocaleString("vi-VN") : "N/A";
      const emailLower = (inc.targetEmail || "").trim().toLowerCase();
      const attemptData = window.geoAuth ? window.geoAuth.getAttemptData(emailLower) : null;
      const isCurrentlyLocked = Boolean(attemptData && (attemptData.isPermanentlyLocked || (attemptData.lockUntil && attemptData.lockUntil > Date.now())));

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td style="font-size: 0.85rem; white-space: nowrap;">${timeStr}</td>
          <td><span class="badge" style="background: #fee2e2; color: #b91c1c; font-weight: 700;">Dò mật khẩu (Brute-force)</span></td>
          <td><code>${escapeHtml(inc.targetEmail || "")}</code></td>
          <td style="font-weight: 700; color: #ef4444; text-align: center;">${inc.failedAttempts || 5} lần</td>
          <td style="font-size: 0.83rem; color: var(--text-muted); max-width: 220px;">${escapeHtml(inc.actionTaken || "Khóa tài khoản & Cảnh báo")}</td>
          <td>
            ${isCurrentlyLocked
          ? `<span class="badge badge-danger" style="background: #ef4444; color: white;">Đang bị khóa</span>`
          : `<span class="user-status-active">Đã mở khóa</span>`}
          </td>
          <td style="text-align: center;">
            <button class="btn btn-sm btn-outline-success" style="padding: 4px 8px; font-size: 0.78rem;" title="Mở khóa tài khoản này" onclick="handleUnlockUserAccount('', '${escapeHtml(inc.targetEmail)}')">
              Mở khóa
            </button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (e) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 16px;">Lỗi tải nhật ký: ${escapeHtml(e.message)}</td></tr>`;
  }
}

// --- USER ENVIRONMENT TELEMETRY & UI ANALYTICS ENGINE ---
const UserTelemetryEngine = {
  // Trích xuất cấu hình hệ điều hành, trình duyệt, độ phân giải và plugin
  getSpecs: function () {
    const ua = navigator.userAgent;
    let os = "Khác";
    let browser = "Khác";
    let version = "";

    // 1. Nhận diện Hệ điều hành
    if (/Windows NT 10.0/i.test(ua)) os = "Windows 10/11";
    else if (/Windows NT 6.3/i.test(ua)) os = "Windows 8.1";
    else if (/Windows NT 6.1/i.test(ua)) os = "Windows 7";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS (Mac)";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS (Apple)";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/Linux/i.test(ua)) os = "Linux";

    // 2. Nhận diện Trình duyệt & Phiên bản
    if (/Edg\/([0-9.]+)/i.test(ua)) {
      browser = "Microsoft Edge";
      version = RegExp.$1;
    } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Edg/i.test(ua)) {
      browser = "Google Chrome";
      version = RegExp.$1;
    } else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = "Apple Safari";
      version = RegExp.$1;
    } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
      browser = "Mozilla Firefox";
      version = RegExp.$1;
    }

    // 3. Danh sách Plugin / Tiện ích hỗ trợ
    const plugins = [];
    if (navigator.plugins && navigator.plugins.length > 0) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        if (navigator.plugins[i] && navigator.plugins[i].name) {
          plugins.push(navigator.plugins[i].name);
        }
      }
    }

    const now = new Date();
    return {
      os: os,
      browser: browser,
      browserVersion: version,
      pluginsCount: plugins.length,
      pluginsList: plugins.slice(0, 10),
      pdfSupported: Boolean(navigator.pdfViewerEnabled),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio || 1,
      language: navigator.language || "vi-VN",
      timestamp: Date.now(),
      recordedAt: now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })
    };
  },

  reportTelemetry: async function () {
    try {
      if (!window.geoDB || !window.geoDB.isTelemetryEnabled()) {
        return; // Đang TẮT -> Dừng hoàn toàn, không tốn dữ liệu
      }

      if (sessionStorage.getItem("geo_telemetry_sent")) {
        return; // Đã ghi nhận trong phiên này
      }

      const specs = this.getSpecs();
      await window.geoDB.recordTelemetry(specs);
      sessionStorage.setItem("geo_telemetry_sent", "true");
    } catch (err) {
      console.debug("[Telemetry] Stopped:", err.message);
    }
  }
};

// --- ADMIN USER TELEMETRY CONTROLLERS ---
async function handleToggleTelemetry() {
  if (!window.geoAuth || !window.geoAuth.isSuperAdmin()) {
    showToast("Chỉ Admin Tổng mới có quyền bật/tắt tính năng này!", "error");
    return;
  }

  const isCurrentEnabled = window.geoDB.isTelemetryEnabled();
  const nextStatus = !isCurrentEnabled;

  try {
    await window.geoDB.setTelemetryEnabled(nextStatus, window.geoAuth.currentUser);
    showToast(`Đã ${nextStatus ? "BẬT" : "TẮT"} tính năng phân tích thiết bị người dùng!`, "success");
    updateTelemetryUI();
    renderAdminTelemetryLogs();
  } catch (err) {
    showToast("Lỗi khi đổi trạng thái: " + err.message, "error");
  }
}

function updateTelemetryUI() {
  const badge = document.getElementById("telemetry-status-badge");
  const btnLabel = document.getElementById("telemetry-btn-label");
  const isEnabled = window.geoDB ? window.geoDB.isTelemetryEnabled() : false;

  if (badge) {
    badge.textContent = isEnabled ? "Đang BẬT" : "Đang TẮT";
    badge.className = isEnabled ? "badge badge-primary" : "badge badge-secondary";
  }

  if (btnLabel) {
    btnLabel.textContent = isEnabled ? "Tắt Thu Thập" : "Bật Thu Thập";
  }
}

async function renderAdminTelemetryLogs() {
  const tbody = document.getElementById("admin-telemetry-table-body");
  if (!tbody || !window.geoAuth || !window.geoAuth.isAdmin()) return;

  updateTelemetryUI();

  try {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px; color:var(--text-muted);">Đang tải dữ liệu phân tích...</td></tr>`;
    const logs = await window.geoDB.getTelemetryLogs(25);

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Chưa có dữ liệu phân tích thiết bị nào được ghi nhận. (Hãy bật tính năng để bắt đầu thu thập)</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map((d, idx) => {
      const pluginsSummary = d.pluginsCount > 0 
        ? `${d.pluginsCount} plugins ${d.pdfSupported ? '(Hỗ trợ PDF)' : ''}` 
        : (d.pdfSupported ? 'Hỗ trợ xem PDF' : 'Mặc định');

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td style="font-size: 0.83rem; white-space: nowrap; color: var(--text-muted);">${d.recordedAt || ''}</td>
          <td><strong style="color: var(--primary);">${escapeHtml(d.os || 'Khác')}</strong></td>
          <td>${escapeHtml(d.browser || 'Trình duyệt')} <span style="font-size: 0.78rem; color: var(--text-muted);">v${escapeHtml(d.browserVersion || '')}</span></td>
          <td><code>${escapeHtml(d.screenResolution || '')}</code> <span style="font-size: 0.75rem; color: var(--text-muted);">(${escapeHtml(d.viewport || '')})</span></td>
          <td style="font-size: 0.82rem;" title="${escapeHtml((d.pluginsList || []).join(', '))}">${escapeHtml(pluginsSummary)}</td>
        </tr>
      `;
    }).join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 16px;">Lỗi tải dữ liệu: ${escapeHtml(e.message)}</td></tr>`;
  }
}

async function handleClearTelemetryLogs() {
  if (!window.geoAuth || !window.geoAuth.isSuperAdmin()) {
    showToast("Chỉ Admin Tổng mới có quyền xóa nhật ký phân tích!", "error");
    return;
  }

  if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử phân tích thiết bị đã ghi nhận?")) {
    return;
  }

  try {
    await window.geoDB.clearTelemetryLogs();
    showToast("Đã xóa toàn bộ dữ liệu phân tích thiết bị!", "success");
    renderAdminTelemetryLogs();
  } catch (err) {
    showToast("Lỗi khi xóa: " + err.message, "error");
  }
}

// --- ADMIN CONFESSIONS INBOX CONTROLLERS ---
function renderAdminConfessionsList() {
  const container = document.getElementById("admin-confessions-list");
  if (!container) return;

  const allCfs = window.geoDB.getConfessions();
  const unreadCount = allCfs.filter(c => c.status === "unread").length;
  const answeredCount = allCfs.filter(c => c.status === "answered").length;

  const elAllCount = document.getElementById("adm-cfs-count-all");
  if (elAllCount) elAllCount.textContent = allCfs.length;
  const elUnreadCount = document.getElementById("adm-cfs-count-unread");
  if (elUnreadCount) elUnreadCount.textContent = unreadCount;
  const elAnsweredCount = document.getElementById("adm-cfs-count-answered");
  if (elAnsweredCount) elAnsweredCount.textContent = answeredCount;

  let filtered = allCfs;
  if (appState.cfsAdminFilter === "unread") {
    filtered = allCfs.filter(c => c.status === "unread");
  } else if (appState.cfsAdminFilter === "answered") {
    filtered = allCfs.filter(c => c.status === "answered");
  }

  const cfsToolbarCount = document.getElementById("admin-cfs-toolbar-count");
  if (cfsToolbarCount) {
    cfsToolbarCount.textContent = `Hòm thư (${filtered.length}/${allCfs.length})`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
   <div class="empty-state" style="padding: 28px 16px;">
    <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">${t("emptyConfessions", "Không có câu hỏi nào phù hợp.")}</p>
   </div>
  `;
    return;
  }

  container.innerHTML = filtered.map((cfs, idx) => {
    const isUnread = cfs.status === "unread";
    const isAnswered = cfs.status === "answered";

    // Số thứ tự (ngược - mới nhất = số 1)
    const sttDisplay = filtered.length - idx;

    let statusBadge = isUnread
      ? `<span class="badge-cfs badge-cfs-unread"> ${t("statusUnread", "Chưa đọc")}</span>`
      : (isAnswered ? `<span class="badge-cfs badge-cfs-answered"> ${t("statusAnswered", "Đã trả lời")}</span>` : `<span class="badge-cfs badge-cfs-question"> Đã xem</span>`);

    let replyBlock = "";
    if (cfs.reply) {
      replyBlock = `
    <div style="background: rgba(13, 148, 136, 0.05); border-left: 3px solid var(--primary); padding: 10px 14px; border-radius: 4px; margin-top: 12px; font-size: 0.88rem;">
     <div style="font-weight: 700; color: var(--primary); margin-bottom: 4px;">
       ${t("adminReplyLabel", "Admin trả lời")} (${escapeHtml(cfs.replyBy || 'Admin')}) — ${cfs.replyDate || ''}:
     </div>
     <div style="color: #334155; line-height: 1.5; white-space: pre-line;">${escapeHtml(cfs.reply)}</div>
    </div>
   `;
    }

    return `
   <div class="admin-cfs-item ${isUnread ? 'unread' : (isAnswered ? 'answered' : '')}">
    <div class="admin-cfs-top">
     <div class="admin-cfs-sender-meta">
      <span style="font-weight: 700; color: var(--text-muted); font-size: 0.85rem; min-width: 36px;">#${sttDisplay}</span>
      ${statusBadge}
      <span style="font-size: 0.78rem; color: var(--text-muted);"> ${cfs.createdAt || 'Vừa gửi'}</span>
     </div>

     <div class="admin-cfs-actions">
      <button class="btn btn-sm btn-primary" onclick="openReplyConfessionModal('${cfs.id}')" title="${t('btnReplyConfession', 'Phản hồi câu hỏi')}">
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
       <span>${cfs.reply ? 'Sửa câu trả lời' : t('btnReplyConfession', 'Trả lời')}</span>
      </button>
      <button class="btn btn-sm btn-secondary" onclick="handleToggleConfessionRead('${cfs.id}')" title="Đánh dấu đã đọc / chưa đọc">
       ${isUnread ? 'Đánh dấu đã xem' : 'Đánh dấu chưa đọc'}
      </button>
      <button class="btn btn-sm btn-danger" onclick="confirmDeleteConfession('${cfs.id}')" title="Xóa câu hỏi này">
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
     </div>
    </div>

    <div style="font-size: 0.95rem; color: #1e293b; line-height: 1.65; white-space: pre-line; margin-top: 8px; padding: 10px 14px; background: var(--bg-surface); border-radius: var(--radius-sm);">
     ${escapeHtml(cfs.message)}
    </div>

    ${replyBlock}
   </div>
  `;
  }).join("");
}

function filterAdminConfessions(filterType) {
  appState.cfsAdminFilter = filterType;
  const btns = document.querySelectorAll("#admin-cfs-filter-btns .btn");
  btns.forEach(b => b.classList.remove("active"));
  const activeBtn = document.getElementById(`filter-cfs-${filterType}`);
  if (activeBtn) activeBtn.classList.add("active");
  renderAdminConfessionsList();
}

function openReplyConfessionModal(cfsId) {
  const cfs = window.geoDB.getConfessionById(cfsId);
  if (!cfs) return;

  document.getElementById("reply-cfs-id").value = cfs.id;
  const isAnon = cfs.isAnonymous;
  document.getElementById("reply-cfs-sender").textContent = (isAnon ? "️ Học sinh ẩn danh" : cfs.senderName) + (cfs.senderEmail ? ` (${cfs.senderEmail})` : '');
  document.getElementById("reply-cfs-date").textContent = cfs.createdAt || '';
  document.getElementById("reply-cfs-subject").textContent = cfs.subject;
  document.getElementById("reply-cfs-message").textContent = cfs.message;

  const currentAdmin = window.geoAuth.currentUser;
  document.getElementById("reply-cfs-author").value = cfs.replyBy || (currentAdmin ? `${currentAdmin.name} (Admin)` : "Trần Huy Vũ (Admin)");
  document.getElementById("reply-cfs-text").value = cfs.reply || "";

  openModal("modal-reply-confession");
}

async function handleSaveConfessionReply(e) {
  e.preventDefault();
  const cfsId = document.getElementById("reply-cfs-id").value;
  const replyBy = document.getElementById("reply-cfs-author").value.trim();
  const replyText = document.getElementById("reply-cfs-text").value.trim();

  if (!cfsId || !replyText) {
    showToast("Vui lòng nhập nội dung câu trả lời!", "error");
    return;
  }

  try {
    await window.geoDB.replyConfession(cfsId, replyText, replyBy);
    closeModal("modal-reply-confession");
    showToast("Đã gửi câu trả lời và công khai giải đáp thành công!", "success");
    renderAdminDashboard();
    renderContactView();
  } catch (err) {
    showToast("Lỗi khi lưu phản hồi: " + err.message, "error");
  }
}

async function handleToggleConfessionRead(cfsId) {
  const cfs = window.geoDB.getConfessionById(cfsId);
  if (!cfs) return;

  const newStatus = cfs.status === "unread" ? "read" : "unread";
  try {
    await window.geoDB.updateConfessionStatus(cfsId, newStatus);
    showToast(newStatus === "read" ? "Đã đánh dấu là đã xem." : "Đã chuyển về trạng thái chưa đọc.", "info");
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function confirmDeleteConfession(cfsId) {
  if (confirm("Bạn có chắc chắn muốn xóa tin nhắn / confession này không?")) {
    try {
      await window.geoDB.deleteConfession(cfsId);
      showToast("Đã xóa confession thành công!", "success");
      renderAdminDashboard();
      renderContactView();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
}

// --- BOOKMARK / SAVE ACTION ---
async function toggleSaveDocument(docId) {
  const user = window.geoAuth.currentUser;
  if (!user) {
    showToast("Vui lòng đăng nhập để lưu tài liệu vào kho cá nhân!", "info");
    openModal("modal-login");
    return;
  }

  try {
    const isSaved = await window.geoDB.toggleSaveDocument(user.email, docId);
    if (isSaved) {
      showToast("Đã lưu tài liệu vào danh sách yêu thích!", "success");
    } else {
      showToast("Đã bỏ lưu tài liệu!", "info");
    }

    updateSavedBadgeCounter();
    if (appState.currentTab === "documents") renderDocumentsView();
    if (appState.currentTab === "saved") renderSavedDocumentsView();
  } catch (err) {
    showToast("Lỗi khi lưu tài liệu: " + err.message, "error");
  }
}

// --- 5-STAR RATING & REVIEWS SYSTEM ---
let currentSelectedRating = 5;

function openRatingModal(docId) {
  const user = window.geoAuth.currentUser;
  if (!user) {
    showToast("Vui lòng đăng nhập để đánh giá sao và viết bình luận!", "info");
    openModal("modal-login");
    return;
  }

  const doc = window.geoDB.getDocumentById(docId);
  if (!doc) return;

  appState.selectedDocForRating = doc;
  currentSelectedRating = 5;

  document.getElementById("rating-doc-title").textContent = doc.title;
  document.getElementById("rating-current-avg").textContent = (doc.avgRating || 5.0).toFixed(1) + " / 5.0";
  document.getElementById("rating-comment").value = "";

  updateStarInputDisplay(5);
  openModal("modal-rating");
}

function updateStarInputDisplay(ratingVal) {
  currentSelectedRating = ratingVal;
  const stars = document.querySelectorAll(".star-rating-input .star-btn");
  stars.forEach(s => {
    const val = parseInt(s.getAttribute("data-value"), 10);
    if (val <= ratingVal) {
      s.classList.add("active");
    } else {
      s.classList.remove("active");
    }
  });
  document.getElementById("rating-value-label").textContent = `${ratingVal} sao (${getRatingLabel(ratingVal)})`;
}

function getRatingLabel(val) {
  if (val === 5) return "Rất xuất sắc & Hữu ích";
  if (val === 4) return "Tài liệu tốt";
  if (val === 3) return "Bình thường";
  if (val === 2) return "Cần bổ sung";
  return "Chưa đạt yêu cầu";
}

async function submitDocRating() {
  const user = window.geoAuth.currentUser;
  if (!user) {
    showToast("Vui lòng đăng nhập để đánh giá tài liệu!", "info");
    openModal("modal-login");
    return;
  }

  if (!appState.selectedDocForRating) return;

  const commentText = document.getElementById("rating-comment").value.trim();

  try {
    const docId = appState.selectedDocForRating.id;
    await window.geoDB.addDocumentRating(docId, currentSelectedRating, commentText, user);

    closeModal("modal-rating");
    showToast(`Cảm ơn ${user.name} đã đánh giá ${currentSelectedRating} sao cho tài liệu!`, "success");

    if (appState.currentTab === "documents") renderDocumentsView();
    if (appState.currentTab === "saved") renderSavedDocumentsView();
  } catch (err) {
    showToast("Lỗi khi đánh giá: " + err.message, "error");
  }
}

// --- DOCUMENT COMMENTS & REVIEWS MODAL SYSTEM ---
let currentCommentRatingStars = 5;
let currentActiveDocIdForComments = null;

function openDocumentCommentsModal(docId) {
  const doc = window.geoDB.getDocumentById(docId);
  if (!doc) return;

  currentActiveDocIdForComments = docId;
  document.getElementById("comments-modal-doc-id").value = doc.id;
  document.getElementById("comments-doc-title").textContent = doc.title;

  const mainCatLabel = doc.mainCat === "dai_cuong" ? "Địa lí đại cương" : "Địa lí Việt Nam";
  const subCatLabel = doc.subCat === "tu_nhien" ? "Tự nhiên" : "Kinh tế - Xã hội";
  document.getElementById("comments-doc-cat").textContent = `${mainCatLabel} • ${subCatLabel}`;
  document.getElementById("comments-doc-grade").textContent = doc.grade || "Toàn cấp";
  document.getElementById("comments-doc-format").textContent = doc.format || "PDF";
  document.getElementById("comments-doc-avg-score").textContent = (doc.avgRating || 5.0).toFixed(1);
  document.getElementById("comments-doc-stars-display").innerHTML = renderStars(doc.avgRating || 5.0);

  const comments = doc.comments || [];
  document.getElementById("comments-doc-count-label").textContent = `${comments.length} bình luận & đánh giá`;
  document.getElementById("comments-total-badge").textContent = comments.length;

  // Form display depending on auth
  const user = window.geoAuth.currentUser;
  const formBox = document.getElementById("comment-logged-in-form");
  const guestBox = document.getElementById("comment-guest-prompt");
  const authorNameDisplay = document.getElementById("comment-author-name-display");

  if (user) {
    if (formBox) formBox.style.display = "block";
    if (guestBox) guestBox.style.display = "none";
    if (authorNameDisplay) authorNameDisplay.textContent = `Bình luận dưới tên: ${user.name} (${user.userType || 'Thành viên'})`;
  } else {
    if (formBox) formBox.style.display = "none";
    if (guestBox) guestBox.style.display = "block";
    if (authorNameDisplay) authorNameDisplay.textContent = "Chưa đăng nhập";
  }

  // Reset comment input
  const commentInput = document.getElementById("comment-input-text");
  if (commentInput) commentInput.value = "";
  setCommentRatingStars(5);

  renderDocCommentsList(doc);
  openModal("modal-doc-comments");
}

function setCommentRatingStars(val) {
  currentCommentRatingStars = Number(val) || 5;
  const btns = document.querySelectorAll("#comment-inline-star-picker .star-btn");
  btns.forEach(b => {
    const starVal = Number(b.getAttribute("data-value"));
    if (starVal <= currentCommentRatingStars) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

  const labelEl = document.getElementById("comment-star-label");
  if (labelEl) {
    labelEl.textContent = `${currentCommentRatingStars} sao (${getRatingLabel(currentCommentRatingStars)})`;
  }
}

function renderDocCommentsList(doc) {
  const container = document.getElementById("comments-list-container");
  if (!container) return;

  const comments = doc.comments || [];
  const isAdmin = window.geoAuth.isAdmin();

  if (comments.length === 0) {
    container.innerHTML = `
   <div class="comment-empty-state">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 8px; display: block; opacity: 0.5;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    <p style="margin-bottom: 4px; font-weight: 600; color: var(--text-main);">Chưa có bình luận nào cho tài liệu này</p>
    <span style="font-size: 0.8rem; color: var(--text-muted);">Hãy là người đầu tiên đánh giá và chia sẻ cảm nhận!</span>
   </div>
  `;
    return;
  }

  container.innerHTML = comments.map(cmt => {
    const isCommentAdmin = cmt.userType === "Admin" || (cmt.userEmail && (cmt.userEmail.toLowerCase() === "vut510624@gmail.com" || cmt.userEmail.toLowerCase() === "hshk.project@gmail.com"));

    let roleBadge = "";
    if (isCommentAdmin) {
      roleBadge = `<span class="badge badge-admin" style="font-size: 0.72rem; padding: 2px 6px;">Admin</span>`;
    } else if (cmt.userType === "Phụ huynh") {
      roleBadge = `<span class="badge badge-accent" style="font-size: 0.72rem; padding: 2px 6px;">Phụ huynh</span>`;
    } else {
      roleBadge = `<span class="badge badge-secondary" style="font-size: 0.72rem; padding: 2px 6px;">${escapeHtml(cmt.userType || 'Học sinh')}</span>`;
    }

    const adminDeleteBtn = isAdmin ? `
   <button class="comment-delete-admin-btn" onclick="handleDeleteDocComment('${doc.id}', '${cmt.id}')" title="Quản trị viên xóa bình luận này">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    <span>Xóa</span>
   </button>
  ` : '';

    return `
   <div class="comment-card-item">
    <div class="comment-item-top">
     <div class="comment-user-meta">
      <div class="comment-avatar-small">${(cmt.userName || 'U').charAt(0).toUpperCase()}</div>
      <div class="comment-user-details">
       <div style="display: flex; align-items: center; gap: 6px;">
        <span class="comment-user-name">${escapeHtml(cmt.userName || 'Người học')}</span>
        ${roleBadge}
       </div>
       <span class="comment-time"> ${cmt.createdAt || 'Vừa xong'}</span>
      </div>
     </div>

     <div class="comment-right-meta">
      <div class="comment-star-badge">
       <span></span>
       <span>${cmt.stars || 5}/5</span>
      </div>
      ${adminDeleteBtn}
     </div>
    </div>

    ${cmt.comment ? `
     <div class="comment-text-content">
      ${escapeHtml(cmt.comment)}
     </div>
    ` : ''}
   </div>
  `;
  }).join("");
}

let _lastCommentSubmitTime = 0;

async function submitDocCommentFromModal() {
  const user = window.geoAuth.currentUser;
  if (!user) {
    showToast("Vui lòng đăng nhập để gửi bình luận!", "info");
    openModal("modal-login");
    return;
  }

  // Rate limit / Cooldown check (10s cooldown per comment)
  const now = Date.now();
  if (now - _lastCommentSubmitTime < 10000) {
    const waitSec = Math.ceil((10000 - (now - _lastCommentSubmitTime)) / 1000);
    showToast(`Vui lòng đợi ${waitSec} giây trước khi gửi tiếp!`, "warning");
    return;
  }

  const docId = currentActiveDocIdForComments || document.getElementById("comments-modal-doc-id").value;
  if (!docId) return;

  const commentInput = document.getElementById("comment-input-text");
  const commentText = (commentInput?.value || "").trim();

  if (commentText.length > 1000) {
    showToast("Nội dung bình luận quá dài (tối đa 1000 ký tự)!", "error");
    return;
  }

  const submitBtn = document.getElementById("btn-submit-doc-comment");

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Đang gửi...</span>`;
    }

    const updatedDoc = await window.geoDB.addDocumentComment(docId, {
      userName: user.name,
      userEmail: user.email,
      userType: user.userType,
      stars: currentCommentRatingStars,
      comment: commentText
    });

    _lastCommentSubmitTime = Date.now();

    if (commentInput) commentInput.value = "";
    showToast("Gửi bình luận và đánh giá thành công!", "success");

    // Cooldown 10s on button
    if (submitBtn) {
      let remain = 10;
      const cdInterval = setInterval(() => {
        remain--;
        if (remain > 0) {
          submitBtn.innerHTML = `<span>Đợi (${remain}s)...</span>`;
        } else {
          clearInterval(cdInterval);
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> <span>Gửi Bình Luận</span>`;
        }
      }, 1000);
    }

    // Refresh modal contents
    if (updatedDoc) {
      document.getElementById("comments-doc-avg-score").textContent = (updatedDoc.avgRating || 5.0).toFixed(1);
      document.getElementById("comments-doc-stars-display").innerHTML = renderStars(updatedDoc.avgRating || 5.0);
      document.getElementById("comments-doc-count-label").textContent = `${(updatedDoc.comments || []).length} bình luận & đánh giá`;
      document.getElementById("comments-total-badge").textContent = (updatedDoc.comments || []).length;
      renderDocCommentsList(updatedDoc);
    }

    if (appState.currentTab === "documents") renderDocumentsView();
    if (appState.currentTab === "saved") renderSavedDocumentsView();
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Gửi Bình Luận</span>`;
    }
    showToast("Lỗi khi gửi bình luận: " + err.message, "error");
  }
}

async function handleDeleteDocComment(docId, commentId) {
  if (!window.geoAuth.isAdmin()) {
    showToast("Chỉ Quản trị viên mới có quyền xóa bình luận!", "error");
    return;
  }

  if (!confirm("Bạn có chắc chắn muốn xóa bình luận này khỏi tài liệu không?")) {
    return;
  }

  try {
    const updatedDoc = await window.geoDB.deleteDocumentComment(docId, commentId);
    showToast("Đã xóa bình luận thành công!", "success");

    if (updatedDoc) {
      document.getElementById("comments-doc-avg-score").textContent = (updatedDoc.avgRating || 5.0).toFixed(1);
      document.getElementById("comments-doc-stars-display").innerHTML = renderStars(updatedDoc.avgRating || 5.0);
      document.getElementById("comments-doc-count-label").textContent = `${(updatedDoc.comments || []).length} bình luận & đánh giá`;
      document.getElementById("comments-total-badge").textContent = (updatedDoc.comments || []).length;
      renderDocCommentsList(updatedDoc);
    }

    if (appState.currentTab === "documents") renderDocumentsView();
    if (appState.currentTab === "saved") renderSavedDocumentsView();
  } catch (err) {
    showToast("Lỗi khi xóa bình luận: " + err.message, "error");
  }
}

function openCommentsFromPreview() {
  const docId = appState.activePreviewDocId || (appState.selectedDocForRating ? appState.selectedDocForRating.id : null);
  closeModal("modal-preview");
  if (docId) {
    openDocumentCommentsModal(docId);
  }
}

// --- PREVIEW DOCUMENT MODAL ---
// Holds Base64 data of current previewed doc's PDF
let _previewPdfBase64 = null;
let _previewPdfFileName = "document.pdf";

async function openDocumentPreview(docId) {
  const doc = window.geoDB.getDocumentById(docId);
  if (!doc) return;

  appState.activePreviewDocId = docId;

  // Tăng lượt xem thực tế theo thời gian thực
  await window.geoDB.recordDocView(docId);

  const mainCatLabel = doc.mainCat === "dai_cuong" ? t("catDaiCuong", "Địa lí đại cương") : t("catVietNam", "Địa lí Việt Nam");
  const subCatLabel = doc.subCat === "tu_nhien" ? t("catTuNhien", "Tự nhiên") : t("catKinhTe", "Kinh tế - Xã hội");
  const docData = window.geoI18n ? window.geoI18n.getDocumentData(doc) : doc;

  document.getElementById("preview-title").textContent = docData.title;
  document.getElementById("preview-cat-badge").textContent = `${mainCatLabel} • ${subCatLabel}`;
  document.getElementById("preview-grade-badge").textContent = doc.grade || "Toàn cấp";
  document.getElementById("preview-author").textContent = doc.author || "High School Help Kit";
  document.getElementById("preview-date").textContent = doc.date || "2026";
  document.getElementById("preview-format").textContent = doc.format || (doc.externalUrl ? "LINK" : "PDF");
  document.getElementById("preview-size").textContent = doc.size || (doc.externalUrl ? "Link Online" : "1.0 MB");
  document.getElementById("preview-downloads").textContent = `${doc.downloads || 0} ${t("downloadsCount", "lượt tải")}`;
  document.getElementById("preview-rating-score").textContent = `${(doc.avgRating || 5.0).toFixed(1)} / 5.0 (${doc.ratings ? doc.ratings.length : 1} đánh giá)`;
  document.getElementById("preview-text-content").textContent = docData.previewText || docData.desc || "Nội dung tài liệu đang được cập nhật...";

  // Reset preview translate button text
  const previewTransBtn = document.getElementById("preview-translate-btn-text");
  if (previewTransBtn) {
    const curLang = window.geoI18n ? window.geoI18n.getLang() : "vi";
    previewTransBtn.textContent = curLang === "vi" ? " Dịch nội dung bằng AI" : ` Dịch sang ${curLang.toUpperCase()}`;
  }

  // Handle PDF / Link section
  const pdfSection = document.getElementById("preview-pdf-section");
  const pdfIframe = document.getElementById("preview-pdf-iframe");
  const downloadBtn = document.getElementById("preview-pdf-download-btn");
  const noPdfBtn = document.getElementById("preview-no-pdf-btn");

  if (doc.pdfUrl) {
    // 1. Uu tien load truc tiep tu Firebase Cloud Storage URL
    _previewPdfBase64 = null;
    _previewPdfFileName = doc.pdfFileName || `${doc.title}.pdf`;
    pdfIframe.src = doc.pdfUrl;
    pdfSection.style.display = "block";
    if (downloadBtn) {
      downloadBtn.style.display = "inline-flex";
      downloadBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Tải Xuống PDF (Cloud)</span>
    `;
      downloadBtn.onclick = () => {
        window.geoDB.recordDocDownload(docId);
        window.open(doc.pdfUrl, "_blank", "noopener,noreferrer");
        showToast("Đang tải xuống tài liệu từ Cloud Storage...", "success");
      };
    }
    if (noPdfBtn) noPdfBtn.style.display = "none";
  } else if (doc.pdfBase64) {
    // 2. Fallback Base64 Blob Viewer
    _previewPdfBase64 = doc.pdfBase64;
    _previewPdfFileName = doc.pdfFileName || `${doc.title}.pdf`;
    const byteChars = atob(doc.pdfBase64.split(',')[1] || doc.pdfBase64);
    const byteNumbers = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteNumbers], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    pdfIframe.src = blobUrl;
    pdfSection.style.display = "block";
    if (downloadBtn) {
      downloadBtn.style.display = "inline-flex";
      downloadBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Tải Xuống PDF</span>
    `;
      downloadBtn.dataset.blobUrl = blobUrl;
      downloadBtn.onclick = downloadPreviewPdf;
    }
    if (noPdfBtn) noPdfBtn.style.display = "none";
  } else if (doc.externalUrl) {
    _previewPdfBase64 = null;
    pdfIframe.src = "";
    pdfSection.style.display = "none";
    if (downloadBtn) {
      downloadBtn.style.display = "inline-flex";
      downloadBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
      <span>Mở Liên Kết Tài Liệu</span>
    `;
      downloadBtn.onclick = () => {
        window.geoDB.recordDocDownload(docId);
        window.open(doc.externalUrl, "_blank", "noopener,noreferrer");
        showToast("Đang mở liên kết tài liệu trực tuyến...", "info");
      };
    }
    if (noPdfBtn) noPdfBtn.style.display = "none";
  } else {
    _previewPdfBase64 = null;
    pdfIframe.src = "";
    pdfSection.style.display = "none";
    if (downloadBtn) downloadBtn.style.display = "none";
    if (noPdfBtn) noPdfBtn.style.display = "inline-flex";
  }

  openModal("modal-preview");
  if (appState.currentTab === "documents") renderDocumentsView();
}

async function translatePreviewDocumentWithAi() {
  const docId = appState.activePreviewDocId;
  if (!docId) return;
  const doc = window.geoDB.getDocumentById(docId);
  if (!doc) return;

  const currentLang = window.geoI18n ? window.geoI18n.getLang() : "vi";
  if (currentLang === "vi") {
    showToast("Vui lòng chuyển sang ngôn ngữ khác (English, 中文, 日本語, 한국어, Русский) ở góc trên để dịch nội dung!", "info");
    return;
  }

  const textEl = document.getElementById("preview-text-content");
  const btnText = document.getElementById("preview-translate-btn-text");
  if (btnText) btnText.textContent = " Đang dịch qua AI...";

  // Check if standard translated dataset exists
  const translated = window.geoI18n.getDocumentData(doc, currentLang);
  if (translated && translated.previewText && translated.previewText !== doc.previewText) {
    if (textEl) textEl.textContent = translated.previewText;
    if (btnText) btnText.textContent = ` Đã dịch sang ${currentLang.toUpperCase()}`;
    showToast(`Đã dịch nội dung sang ${window.geoI18n.getLanguageMeta(currentLang).name}!`, "success");
    return;
  }

  // Otherwise call Gemini AI API for on-the-fly translation
  try {
    const rawText = doc.previewText || doc.desc || "";
    let translatedText = "";

    // 1. Uu tien goi Backend Proxy (/api/ai/translate)
    let backendSuccess = false;
    try {
      const proxyRes = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText, targetLang: currentLang })
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.translatedText) {
          translatedText = proxyData.translatedText;
          backendSuccess = true;
        }
      }
    } catch (proxyErr) { }

    // 2. Fallback goi truc tiep neu backend khong kha dung
    if (!backendSuccess) {
      const prompt = `Translate the following Geography study material excerpt into language '${currentLang}'. Return only the translated text accurately with proper educational geography terminology:\n\n${rawText}`;
      const res = await fetch(`${AI_CONFIG.API_URL}?key=${AI_CONFIG.API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.2 }
        })
      });

      const data = await res.json();
      translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (translatedText && textEl) {
      textEl.textContent = translatedText;
      if (btnText) btnText.textContent = ` Đã dịch sang ${currentLang.toUpperCase()}`;
      showToast(`AI đã dịch nội dung thành công!`, "success");
    } else {
      throw new Error("No translation returned");
    }
  } catch (err) {
    console.error("AI translation error:", err);
    if (btnText) btnText.textContent = ` Dịch sang ${currentLang.toUpperCase()}`;
    showToast("Không thể dịch nội dung qua AI lúc này. Vui lòng thử lại!", "error");
  }
}

async function downloadPreviewPdf() {
  const btn = document.getElementById("preview-pdf-download-btn");
  if (!btn) return;
  const blobUrl = btn.dataset.blobUrl;
  const fname = _previewPdfFileName || "document.pdf";
  if (blobUrl) {
    if (appState.activePreviewDocId) {
      await window.geoDB.recordDocDownload(appState.activePreviewDocId);
    }
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fname;
    a.click();
    showToast("Đang tải xuống file PDF...", "success");
  }
}

// --- ADMIN CRUD: POSTS ---
function openAddPostModal(type) {
  appState.activePostEditTarget = { type, id: null };
  document.getElementById("post-modal-title").textContent = type === "hshk"
    ? "Thêm Bài Viết High School Help Kit"
    : "Thêm Bài Viết Group Địa Lí";

  document.getElementById("post-form-type").value = type;
  document.getElementById("post-form-id").value = "";
  document.getElementById("post-form-title").value = "";
  document.getElementById("post-form-tag").value = type === "hshk" ? "Dự án" : "Cộng đồng";
  document.getElementById("post-form-author").value = type === "hshk" ? "Ban Điều Hành HSHK" : "Admin Group";
  document.getElementById("post-form-content").value = "";

  openModal("modal-post-crud");
}

function openEditPostModal(type, id) {
  const posts = type === "hshk" ? window.geoDB.getHshkPosts() : window.geoDB.getGroupPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;

  appState.activePostEditTarget = { type, id };
  document.getElementById("post-modal-title").textContent = type === "hshk"
    ? "Chỉnh Sửa Bài Viết High School Help Kit"
    : "Chỉnh Sửa Bài Viết Group Địa Lí";

  document.getElementById("post-form-type").value = type;
  document.getElementById("post-form-id").value = post.id;
  document.getElementById("post-form-title").value = post.title;
  document.getElementById("post-form-tag").value = post.tag || "";
  document.getElementById("post-form-author").value = post.author || "";
  document.getElementById("post-form-content").value = post.content || "";

  openModal("modal-post-crud");
}

let _isSavingPost = false;
async function handleSavePost(e) {
  if (e) {
    e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
  }
  if (_isSavingPost) return;

  const type = document.getElementById("post-form-type").value;
  const id = document.getElementById("post-form-id").value;
  const title = document.getElementById("post-form-title").value.trim();
  const tag = document.getElementById("post-form-tag").value.trim();
  const author = document.getElementById("post-form-author").value.trim();
  const content = document.getElementById("post-form-content").value.trim();

  if (!title || !content) {
    showToast("Vui lòng nhập tiêu đề và nội dung bài viết!", "error");
    return;
  }

  const submitBtn = document.querySelector("#form-post-crud button[type='submit']");
  const origHtml = submitBtn ? submitBtn.innerHTML : "";

  try {
    _isSavingPost = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<span>Đang lưu...</span>";
    }

    const postData = { id: id || undefined, title, tag, author, content };
    if (type === "hshk") {
      await window.geoDB.saveHshkPost(postData);
    } else {
      await window.geoDB.saveGroupPost(postData);
    }

    closeModal("modal-post-crud");
    showToast(id ? "Đã cập nhật bài viết thành công!" : "Đã đăng bài viết mới thành công!", "success");
    renderHomeView();
  } catch (err) {
    showToast("Lỗi khi lưu bài viết: " + err.message, "error");
  } finally {
    _isSavingPost = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

async function confirmDeletePost(type, id) {
  if (confirm("Bạn có chắc chắn muốn xóa bài viết này không? Hành động không thể hoàn tác.")) {
    try {
      document.querySelectorAll(`button[onclick*="confirmDeletePost('${type}', '${id}')"]`).forEach(btn => {
        const card = btn.closest(".post-card");
        if (card) card.remove();
      });

      if (type === "hshk") await window.geoDB.deleteHshkPost(id);
      else await window.geoDB.deleteGroupPost(id);

      showToast("Đã xóa bài viết thành công!", "success");
      renderHomeView();
    } catch (err) {
      showToast("Lỗi khi xóa bài viết: " + err.message, "error");
    }
  }
}

// --- ADMIN CRUD: DOCUMENTS ---
function openAddDocumentModal() {
  appState.activeDocEditTargetId = null;
  document.getElementById("doc-modal-title").textContent = "Thêm Tài Liệu Mới";
  document.getElementById("doc-form-id").value = "";
  document.getElementById("doc-form-title").value = "";
  document.getElementById("doc-form-main-cat").value = "dai_cuong";
  document.getElementById("doc-form-sub-cat").value = "tu_nhien";
  document.getElementById("doc-form-grade").value = "Lớp 10";
  document.getElementById("doc-form-format").value = "PDF";
  document.getElementById("doc-form-size").value = "";
  document.getElementById("doc-form-author").value = "High School Help Kit";
  document.getElementById("doc-form-desc").value = "";
  document.getElementById("doc-form-preview").value = "";
  document.getElementById("doc-form-external-url").value = "";

  // Set default attachment type to 'file'
  const radioFile = document.getElementById("doc-attach-type-file");
  if (radioFile) radioFile.checked = true;
  toggleDocAttachType("file");

  clearPdfUpload();
  document.getElementById("pdf-existing-info").style.display = "none";

  openModal("modal-doc-crud");
}

function toggleDocAttachType(type) {
  const fileSection = document.getElementById("doc-attach-file-section");
  const linkSection = document.getElementById("doc-attach-link-section");
  const formatSelect = document.getElementById("doc-form-format");

  if (type === "link") {
    if (fileSection) fileSection.style.display = "none";
    if (linkSection) linkSection.style.display = "block";
    if (formatSelect && formatSelect.value === "PDF") formatSelect.value = "DOCX";
  } else {
    if (fileSection) fileSection.style.display = "block";
    if (linkSection) linkSection.style.display = "none";
    if (formatSelect) formatSelect.value = "PDF";
  }
}

function openEditDocumentModal(id) {
  const doc = window.geoDB.getDocumentById(id);
  if (!doc) return;

  appState.activeDocEditTargetId = id;
  document.getElementById("doc-modal-title").textContent = "Chỉnh Sửa Tài Liệu";
  document.getElementById("doc-form-id").value = doc.id;
  document.getElementById("doc-form-title").value = doc.title;
  document.getElementById("doc-form-main-cat").value = doc.mainCat || "dai_cuong";
  document.getElementById("doc-form-sub-cat").value = doc.subCat || "tu_nhien";
  document.getElementById("doc-form-grade").value = doc.grade || "Lớp 10";
  document.getElementById("doc-form-format").value = doc.format || "PDF";
  document.getElementById("doc-form-size").value = doc.size || "";
  document.getElementById("doc-form-author").value = doc.author || "High School Help Kit";
  document.getElementById("doc-form-desc").value = doc.desc || "";
  document.getElementById("doc-form-preview").value = doc.previewText || "";
  document.getElementById("doc-form-external-url").value = doc.externalUrl || "";

  const isLink = doc.attachmentType === "link" || Boolean(doc.externalUrl && !doc.pdfBase64);
  if (isLink) {
    const radioLink = document.getElementById("doc-attach-type-link");
    if (radioLink) radioLink.checked = true;
    toggleDocAttachType("link");
  } else {
    const radioFile = document.getElementById("doc-attach-type-file");
    if (radioFile) radioFile.checked = true;
    toggleDocAttachType("file");
  }

  // Show existing PDF indicator
  clearPdfUpload();
  const existingInfo = document.getElementById("pdf-existing-info");
  if (existingInfo) existingInfo.style.display = doc.pdfBase64 ? "flex" : "none";

  openModal("modal-doc-crud");
}

let _isSavingDoc = false;
async function handleSaveDocument(e) {
  if (e) {
    e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
  }
  if (_isSavingDoc) return;

  const id = document.getElementById("doc-form-id").value;
  const title = document.getElementById("doc-form-title").value.trim();
  const mainCat = document.getElementById("doc-form-main-cat").value;
  const subCat = document.getElementById("doc-form-sub-cat").value;
  const grade = document.getElementById("doc-form-grade").value.trim();
  const format = document.getElementById("doc-form-format").value;
  const size = document.getElementById("doc-form-size").value.trim();
  const author = document.getElementById("doc-form-author").value.trim();
  const desc = document.getElementById("doc-form-desc").value.trim();
  const previewText = document.getElementById("doc-form-preview").value.trim();
  const externalUrl = document.getElementById("doc-form-external-url").value.trim();

  const isLinkType = document.getElementById("doc-attach-type-link")?.checked;

  if (!title || !desc) {
    showToast("Vui lòng điền tiêu đề và mô tả tài liệu!", "error");
    return;
  }

  if (isLinkType && !externalUrl) {
    showToast("Vui lòng nhập đường dẫn URL liên kết tài liệu trực tiếp!", "error");
    return;
  }

  const submitBtn = document.querySelector("#form-doc-crud button[type='submit']");
  const origHtml = submitBtn ? submitBtn.innerHTML : "";

  try {
    _isSavingDoc = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<span>Đang lưu...</span>";
    }

    // Prepare base doc data
    const docData = {
      id: id || undefined,
      title,
      mainCat,
      subCat,
      grade,
      format,
      attachmentType: isLinkType ? "link" : "file",
      externalUrl: isLinkType ? externalUrl : "",
      size: size || (isLinkType ? "Link Online" : (appState.pendingPdfSize || "1.0 MB")),
      author: author || "HSHK Geography Lab",
      desc,
      previewText: previewText || desc
    };

    if (isLinkType) {
      docData.pdfBase64 = null;
      docData.pdfFileName = null;
      docData.pdfUrl = null;
    } else {
      // If a new PDF file was chosen, upload to Cloud Storage
      if (appState.pendingPdfFile) {
        showToast("Đang tải tệp PDF lên Cloud Storage...", "info");
        const uploadRes = await window.geoDB.uploadPdfToCloudStorage(appState.pendingPdfFile);
        docData.pdfUrl = uploadRes.url || null;
        docData.storagePath = uploadRes.storagePath || null;
        docData.pdfFileName = uploadRes.fileName || appState.pendingPdfFileName;
        docData.size = uploadRes.size || appState.pendingPdfSize;
        docData.pdfBase64 = uploadRes.base64 || null;
      } else if (appState.pendingPdfBase64) {
        docData.pdfBase64 = appState.pendingPdfBase64;
        docData.pdfFileName = appState.pendingPdfFileName;
      } else if (id) {
        const existing = window.geoDB.getDocumentById(id);
        if (existing) {
          docData.pdfUrl = existing.pdfUrl || null;
          docData.storagePath = existing.storagePath || null;
          docData.pdfBase64 = existing.pdfBase64 || null;
          docData.pdfFileName = existing.pdfFileName || null;
        }
      }
    }

    await window.geoDB.saveDocument(docData);
    closeModal("modal-doc-crud");
    clearPdfUpload();
    showToast(id ? "Đã cập nhật tài liệu thành công!" : "Đã thêm tài liệu mới thành công!", "success");

    renderDocumentsView();
    updateStatsCounters();
    if (appState.currentTab === "admin-panel") renderAdminDashboard();
  } catch (err) {
    showToast("Lỗi khi lưu tài liệu: " + err.message, "error");
  } finally {
    _isSavingDoc = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}

async function confirmDeleteDocument(id) {
  if (confirm("Bạn có chắc chắn muốn xóa tài liệu này không? Hành động này sẽ xóa vĩnh viễn.")) {
    try {
      document.querySelectorAll(`button[onclick*="confirmDeleteDocument('${id}')"]`).forEach(btn => {
        const card = btn.closest(".doc-card");
        if (card) card.remove();
      });

      await window.geoDB.deleteDocument(id);
      showToast("Đã xóa tài liệu thành công!", "success");
      renderDocumentsView();
      renderSavedDocumentsView();
      updateSavedBadgeCounter();
      updateStatsCounters();
    } catch (err) {
      showToast("Lỗi khi xóa tài liệu: " + err.message, "error");
    }
  }
}

// --- ADMIN CRUD: CONTACT INFO ---
function openEditContactModal() {
  const info = window.geoDB.getContactInfo();
  document.getElementById("contact-edit-project").value = info.project_name || "";
  document.getElementById("contact-edit-slogan").value = info.slogan || "";
  document.getElementById("contact-edit-email").value = info.email || "";
  document.getElementById("contact-edit-hotline").value = info.hotline || "";
  document.getElementById("contact-edit-fanpage-name").value = info.fanpage_name || "";
  document.getElementById("contact-edit-fanpage-url").value = info.fanpage_url || "";
  document.getElementById("contact-edit-group-name").value = info.group_name || "";
  document.getElementById("contact-edit-group-url").value = info.group_url || "";
  document.getElementById("contact-edit-address").value = info.address || "";
  document.getElementById("contact-edit-hours").value = info.work_hours || "";

  openModal("modal-contact-crud");
}

async function handleSaveContactInfo(e) {
  e.preventDefault();
  const updatedInfo = {
    project_name: document.getElementById("contact-edit-project").value.trim(),
    slogan: document.getElementById("contact-edit-slogan").value.trim(),
    email: document.getElementById("contact-edit-email").value.trim(),
    hotline: document.getElementById("contact-edit-hotline").value.trim(),
    fanpage_name: document.getElementById("contact-edit-fanpage-name").value.trim(),
    fanpage_url: document.getElementById("contact-edit-fanpage-url").value.trim(),
    group_name: document.getElementById("contact-edit-group-name").value.trim(),
    group_url: document.getElementById("contact-edit-group-url").value.trim(),
    address: document.getElementById("contact-edit-address").value.trim(),
    work_hours: document.getElementById("contact-edit-hours").value.trim()
  };

  try {
    await window.geoDB.saveContactInfo(updatedInfo);
    closeModal("modal-contact-crud");
    showToast("Đã cập nhật thông tin liên hệ thành công!", "success");
    renderContactView();
  } catch (err) {
    showToast("Lỗi khi lưu thông tin: " + err.message, "error");
  }
}

// --- USER PROFILE & CHANGE PASSWORD ---
function openChangePasswordModal() {
  const user = window.geoAuth.currentUser;
  if (!user) {
    showToast("Vui lòng đăng nhập tài khoản!", "info");
    openModal("modal-login");
    return;
  }

  const avatarEl = document.getElementById("change-pwd-user-avatar");
  const nameEl = document.getElementById("change-pwd-user-name");
  const emailEl = document.getElementById("change-pwd-user-email");
  const googleNotice = document.getElementById("change-pwd-google-notice");
  const fields = document.getElementById("change-pwd-fields");
  const submitBtn = document.getElementById("btn-submit-change-pwd");

  if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = user.name || 'Người dùng';
  if (emailEl) emailEl.textContent = user.email || '';

  // Reset inputs
  const curInp = document.getElementById("pwd-current");
  const newInp = document.getElementById("pwd-new");
  const cfmInp = document.getElementById("pwd-confirm");
  if (curInp) curInp.value = "";
  if (newInp) newInp.value = "";
  if (cfmInp) cfmInp.value = "";

  const isGoogleUser = user.authProvider === "google" || user.password === "__google_oauth__";
  if (isGoogleUser) {
    if (googleNotice) googleNotice.style.display = "block";
    if (fields) fields.style.display = "none";
    if (submitBtn) submitBtn.style.display = "none";
  } else {
    if (googleNotice) googleNotice.style.display = "none";
    if (fields) fields.style.display = "block";
    if (submitBtn) submitBtn.style.display = "inline-flex";
  }

  if (typeof setupPasswordToggles === "function") {
    setupPasswordToggles();
  }

  openModal("modal-change-password");
}

async function handleChangePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById("pwd-current").value;
  const newPassword = document.getElementById("pwd-new").value;
  const confirmPassword = document.getElementById("pwd-confirm").value;

  try {
    await window.geoAuth.changePassword({ currentPassword, newPassword, confirmPassword });
    closeModal("modal-change-password");
    showToast("Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- SUPER ADMIN CRUD: ADMINS & USERS ---
function openAddAdminModal() {
  if (!window.geoAuth.isSuperAdmin()) {
    showToast("Chỉ có Super Admin mới có quyền thêm Admin!", "error");
    return;
  }
  document.getElementById("add-admin-name").value = "";
  document.getElementById("add-admin-email").value = "";
  document.getElementById("add-admin-password").value = "";
  openModal("modal-add-admin");
}

async function handleSaveAdmin(e) {
  e.preventDefault();
  const fullName = document.getElementById("add-admin-name").value.trim();
  const email = document.getElementById("add-admin-email").value.trim();
  const password = document.getElementById("add-admin-password").value;

  if (!fullName || !email || !password) {
    showToast("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
    return;
  }

  try {
    const adminUser = await window.geoAuth.addAdmin({ fullName, email, password });
    closeModal("modal-add-admin");
    showToast(`Đã thêm Quản trị viên mới: ${adminUser.name} (${adminUser.email}) thành công!`, "success");
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleDemoteAdmin(userId, userEmail) {
  if (!confirm(`Bạn có chắc chắn muốn hạ quyền Quản trị viên của ${userEmail} xuống thành Thành viên thường không?`)) {
    return;
  }
  try {
    await window.geoAuth.removeAdminRole(userId, userEmail);
    showToast(`Đã hủy quyền Admin của ${userEmail} thành công!`, "success");
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handlePromoteAdmin(userId, userEmail) {
  if (!confirm(`Bạn có chắc chắn muốn thăng cấp cho ${userEmail} làm Quản trị viên (Admin) không?`)) {
    return;
  }
  try {
    await window.geoAuth.promoteToAdmin(userId, userEmail);
    showToast(`Đã thăng cấp ${userEmail} lên Quản trị viên thành công!`, "success");
    renderAdminDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleDeleteUserAccount(userId, userEmail) {
  if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản ${userEmail} không? Hành động này không thể hoàn tác!`)) {
    return;
  }
  try {
    await window.geoAuth.deleteUserAccount(userId, userEmail);
    showToast(`Đã xóa vĩnh viễn tài khoản ${userEmail} khỏi hệ thống!`, "success");
    renderAdminDashboard();
    updateStatsCounters();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- SUPER ADMIN USER IMPERSONATION / LOGIN AS MEMBER CONTROLLER ---
function handleImpersonateUser(userId, userEmail) {
  if (!window.geoAuth || (!window.geoAuth.isSuperAdmin() && !window.geoAuth.isImpersonating())) {
    return;
  }

  try {
    const impersonated = window.geoAuth.impersonateUser(userId || userEmail);
    updateImpersonationBanner();
    checkAuthGate();
    switchTab("home");
    renderHomeView();
    updateStatsCounters();
  } catch (err) {
    console.warn("[Impersonate] Error:", err.message);
  }
}

function handleExitImpersonation() {
  if (!window.geoAuth || !window.geoAuth.isImpersonating()) return;

  try {
    window.geoAuth.exitImpersonation();
    updateImpersonationBanner();
    checkAuthGate();
    switchTab("admin-panel");
    renderAdminDashboard();
  } catch (err) {
    console.warn("[Impersonate] Exit error:", err.message);
  }
}

function updateImpersonationBanner() {
  const banner = document.getElementById("impersonation-banner");
  const nameEl = document.getElementById("impersonated-user-name");
  const emailEl = document.getElementById("impersonated-user-email");
  if (!banner) return;

  if (window.geoAuth && window.geoAuth.isImpersonating()) {
    const user = window.geoAuth.currentUser;
    if (nameEl) nameEl.textContent = user?.name || "Thành viên";
    if (emailEl) emailEl.textContent = user?.email || "";
    banner.style.display = "block";
  } else {
    banner.style.display = "none";
  }
}

// --- ADMIN USER PASSWORD MANAGEMENT (VIEW / COPY / RESET) ---
function toggleUserPasswordVisibility(userId) {
  const textEl = document.getElementById(`pwd-text-${userId}`);
  const iconEl = document.getElementById(`pwd-icon-${userId}`);
  if (!textEl) return;

  const isMasked = textEl.getAttribute("data-is-visible") !== "true";
  if (isMasked) {
    textEl.textContent = textEl.getAttribute("data-full") || "";
    textEl.setAttribute("data-is-visible", "true");
    textEl.style.letterSpacing = "normal";
    if (iconEl) iconEl.textContent = "Ẩn";
  } else {
    textEl.textContent = textEl.getAttribute("data-masked") || "••••••••";
    textEl.setAttribute("data-is-visible", "false");
    textEl.style.letterSpacing = "1px";
    if (iconEl) iconEl.textContent = "Xem";
  }
}

async function copyUserPassword(userId) {
  showToast("Mật khẩu thành viên được bảo vệ an toàn theo chuẩn PBKDF2 và không thể sao chép dưới dạng thô.", "info");
}

function openAdminResetPasswordModal(userId, userEmail, userName) {
  const modal = document.getElementById("modal-admin-reset-pwd");
  if (!modal) return;
  const idInput = document.getElementById("admin-reset-target-id");
  const nameEl = document.getElementById("admin-reset-user-name");
  const emailEl = document.getElementById("admin-reset-user-email");
  const avatarEl = document.getElementById("admin-reset-user-avatar");
  const pwdInput = document.getElementById("admin-reset-new-pwd");

  if (idInput) idInput.value = userId || "";
  if (nameEl) nameEl.textContent = userName || "Thành viên";
  if (emailEl) emailEl.textContent = userEmail || "";
  if (avatarEl) avatarEl.textContent = (userName || "U").charAt(0).toUpperCase();
  if (pwdInput) pwdInput.value = "";

  openModal("modal-admin-reset-pwd");
}

function generateRandomPasswordForAdminReset() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const input = document.getElementById("admin-reset-new-pwd");
  if (input) {
    input.value = pwd;
    showToast("Đã tạo mật khẩu ngẫu nhiên!", "info");
  }
}

async function copyAdminResetPassword() {
  const input = document.getElementById("admin-reset-new-pwd");
  if (!input || !input.value) {
    showToast("Vui lòng nhập hoặc tạo mật khẩu trước!", "warning");
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(input.value);
    } else {
      input.select();
      document.execCommand("copy");
    }
    showToast("Đã sao chép mật khẩu mới!", "success");
  } catch (e) {
    showToast("Không thể sao chép: " + e.message, "error");
  }
}

async function handleAdminResetPasswordSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const userId = document.getElementById("admin-reset-target-id")?.value;
  const newPwd = document.getElementById("admin-reset-new-pwd")?.value;
  if (!userId || !newPwd) {
    showToast("Vui lòng nhập mật khẩu mới!", "warning");
    return;
  }
  try {
    await window.geoAuth.adminResetUserPassword(userId, newPwd);
    closeModal("modal-admin-reset-pwd");
    showToast("Đã cập nhật mật khẩu thành viên thành công!", "success");
    renderAdmin();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Super Admin Action: Bật/Tắt ủy quyền xem mật khẩu cho Admin khác
async function handleTogglePasswordDelegation(userId, userEmail, allow) {
  if (!window.geoAuth || !window.geoAuth.isSuperAdmin()) {
    showToast("Chỉ Quản Trị Viên Tổng (Nhà sáng tạo) mới có quyền ủy quyền xem mật khẩu!", "error");
    return;
  }

  const actionText = allow ? "ủy quyền xem mật khẩu" : "thu hồi quyền xem mật khẩu";
  if (!confirm(`Bạn có chắc chắn muốn ${actionText} cho tài khoản (${userEmail})?`)) {
    return;
  }

  try {
    await window.geoAuth.togglePasswordDelegation(userId, allow);
    showToast(`Đã ${actionText} thành công cho tài khoản!`, "success");
    renderAdmin();
  } catch (err) {
    showToast(err.message, "error");
  }
}

window.toggleUserPasswordVisibility = toggleUserPasswordVisibility;
window.copyUserPassword = copyUserPassword;
window.openAdminResetPasswordModal = openAdminResetPasswordModal;
window.generateRandomPasswordForAdminReset = generateRandomPasswordForAdminReset;
window.copyAdminResetPassword = copyAdminResetPassword;
window.handleAdminResetPasswordSubmit = handleAdminResetPasswordSubmit;
window.handleTogglePasswordDelegation = handleTogglePasswordDelegation;

// --- MAINTENANCE MODE CONTROLLER ---
let _pendingMaintenanceToggleState = false;

function updateMaintenanceUI() {
  const isMaint = window.geoDB ? window.geoDB.isMaintenanceActive() : false;
  const canToggle = window.geoAuth ? window.geoAuth.canToggleMaintenance() : false;
  const isAdmin = window.geoAuth ? window.geoAuth.isAdmin() : false;
  const isSuper = window.geoAuth ? window.geoAuth.isSuperAdmin() : false;

  // 1. Full-screen Maintenance Overlay for Regular Users & Guests (All Admins bypass)
  const fullOverlay = document.getElementById("full-maintenance-overlay");
  if (fullOverlay) {
    if (isMaint && !isAdmin) {
      fullOverlay.style.display = "flex";
      document.body.style.overflow = "hidden";
      if (window.geoI18n) window.geoI18n.applyTranslations();
    } else {
      fullOverlay.style.display = "none";
      if (!isMaint || isAdmin) document.body.style.overflow = "";
    }
  }

  // 2. Top Sticky Maintenance Warning Banner (Visible to Admins while logged in during maintenance)
  const banner = document.getElementById("maintenance-banner");
  const bannerAction = document.getElementById("maintenance-banner-action");
  if (banner) {
    banner.style.display = (isMaint && isAdmin) ? "block" : "none";
    if (bannerAction) {
      if (isMaint && canToggle) {
        bannerAction.innerHTML = `
          <button class="btn btn-sm" style="background: white; color: #b45309; font-weight: 700; border: none; box-shadow: var(--shadow-sm);" onclick="openMaintenanceToggleModal(false)">
            Tắt Chế Độ Bảo Trì
          </button>
        `;
      } else {
        bannerAction.innerHTML = "";
      }
    }
  }

  // 3. Admin Dashboard Maintenance Card
  const badge = document.getElementById("adm-maintenance-status-badge");
  const desc = document.getElementById("adm-maintenance-status-desc");
  const actionsWrap = document.getElementById("adm-maintenance-actions-wrap");

  if (badge) {
    if (isMaint) {
      badge.textContent = "ĐANG BẬT BẢO TRÌ";
      badge.style.background = "#ea580c";
    } else {
      badge.textContent = "ĐANG HOẠT ĐỘNG BÌNH THƯỜNG";
      badge.style.background = "#10b981";
    }
  }

  if (desc) {
    if (isMaint) {
      desc.textContent = "Chế độ bảo trì đang BẬT: Toàn bộ thành viên và khách đang nhìn thấy màn hình thông báo bảo trì.";
    } else {
      desc.textContent = "Khi bật bảo trì: Màn hình của tất cả thành viên (trừ Quản trị viên) sẽ hiện thông báo bảo trì.";
    }
  }

  if (actionsWrap) {
    let actionButtons = "";
    if (canToggle) {
      actionButtons += `
        <button class="btn btn-sm ${isMaint ? 'btn-success' : 'btn-danger'}" onclick="openMaintenanceToggleModal(${!isMaint})">
          ${isMaint ? 'Tắt Chế Độ Bảo Trì' : 'Bật Chế Độ Bảo Trì'}
        </button>
      `;
    }
    if (isSuper) {
      actionButtons += `
        <button class="btn btn-sm btn-outline-primary" onclick="openChangeMaintenancePwdModal()" title="Chỉ Nhà sáng tạo có quyền đổi mật khẩu bảo trì">
          Đổi Mật Khẩu Bảo Trì
        </button>
      `;
    }
    actionsWrap.innerHTML = actionButtons;
  }
}

// --- MAINTENANCE TROUBLESHOOT & RECOVERY PORTAL ---
function openMaintenanceTroubleshootModal() {
  const codeInput = document.getElementById("maint-troubleshoot-code");
  if (codeInput) codeInput.value = "";
  openModal("modal-maintenance-troubleshoot");
  setTimeout(() => {
    if (codeInput) codeInput.focus();
  }, 100);
}

function submitMaintenanceTroubleshoot(e) {
  if (e && e.preventDefault) e.preventDefault();
  const codeInput = document.getElementById("maint-troubleshoot-code");
  const code = codeInput ? codeInput.value.trim() : "";

  if (!code) {
    showToast("Vui lòng nhập mã bảo mật khắc phục sự cố!", "error");
    return;
  }

  // 1. Creator Code: Xác thực bằng chuỗi băm bảo mật SHA-256
  const codeHash = typeof _sha256Pure === "function" ? _sha256Pure(code) : "";
  if (codeHash === "f2bed619c6da0437e3bede057619770b684f9ef7fb7b40191405bf7922456ec5") {
    closeModal("modal-maintenance-troubleshoot");
    const fullOverlay = document.getElementById("full-maintenance-overlay");
    if (fullOverlay) {
      fullOverlay.style.display = "none";
    }
    switchAuthGateTab("login");
    const emailInput = document.getElementById("gate-login-email");
    const pwdInput = document.getElementById("gate-login-password");
    if (emailInput) {
      emailInput.value = "vut510624@gmail.com";
    }
    if (pwdInput) {
      pwdInput.value = "";
      setTimeout(() => pwdInput.focus(), 150);
    }
    showToast("Đã xác thực mã Nhà sáng tạo thành công! Vui lòng đăng nhập tài khoản Creator để tiếp tục.", "success");
    return;
  }

  // 2. Other Admin Code: hshk.geo -> Mở đăng nhập cho Quản trị viên
  if (code === "hshk.geo") {
    closeModal("modal-maintenance-troubleshoot");
    const fullOverlay = document.getElementById("full-maintenance-overlay");
    if (fullOverlay) {
      fullOverlay.style.display = "none";
    }
    switchAuthGateTab("login");
    const emailInput = document.getElementById("gate-login-email");
    const pwdInput = document.getElementById("gate-login-password");
    if (emailInput) {
      emailInput.value = "";
      setTimeout(() => emailInput.focus(), 150);
    }
    if (pwdInput) pwdInput.value = "";
    showToast("Mã xác thực Quản trị viên hợp lệ! Vui lòng đăng nhập đúng tài khoản Admin của bạn.", "success");
    return;
  }

  // Sai mã
  showToast("Mã xác thực khắc phục sự cố không chính xác! Vui lòng kiểm tra lại.", "error");
  if (codeInput) {
    codeInput.select();
  }
}

// Giữ lại alias tương thích ngược
function openAdminMaintenanceLogin() {
  openMaintenanceTroubleshootModal();
}

function openMaintenanceToggleModal(targetState) {
  if (!window.geoAuth.canToggleMaintenance()) {
    showToast("Bạn chưa được cấp quyền bật/tắt chế độ bảo trì!", "error");
    return;
  }

  _pendingMaintenanceToggleState = Boolean(targetState);
  const modalTitle = document.getElementById("maint-modal-title");
  const modalDesc = document.getElementById("maint-modal-desc");
  const confirmBtn = document.getElementById("btn-maint-confirm-submit");
  const pwdInput = document.getElementById("maint-input-pwd");

  if (pwdInput) pwdInput.value = "";

  if (_pendingMaintenanceToggleState) {
    if (modalTitle) modalTitle.textContent = "Xác Nhận BẬT Chế Độ Bảo Trì";
    if (modalDesc) modalDesc.textContent = "️ Khi BẬT bảo trì: Toàn bộ thành viên sẽ chỉ sử dụng được trang chủ, bài viết và Trợ lý AI sẽ tạm khóa. Vui lòng nhập mật khẩu bảo trì do Nhà sáng tạo cấp.";
    if (confirmBtn) {
      confirmBtn.textContent = "️ Xác Nhận BẬT Bảo Trì";
      confirmBtn.className = "btn btn-danger";
    }
  } else {
    if (modalTitle) modalTitle.textContent = "Xác Nhận TẮT Chế Độ Bảo Trì";
    if (modalDesc) modalDesc.textContent = " Khi TẮT bảo trì: Hệ thống sẽ mở lại toàn bộ tính năng (Bài viết, Kho tài liệu, Trợ lý AI) cho tất cả thành viên bình thường.";
    if (confirmBtn) {
      confirmBtn.textContent = " Xác Nhận TẮT Bảo Trì";
      confirmBtn.className = "btn btn-success";
    }
  }

  openModal("modal-maintenance-toggle");
}

async function submitMaintenanceToggle(e) {
  if (e && e.preventDefault) e.preventDefault();
  const pwd = document.getElementById("maint-input-pwd").value;
  const user = window.geoAuth.currentUser;

  if (!pwd) {
    showToast("Vui lòng nhập mật khẩu bảo trì!", "error");
    return;
  }

  try {
    await window.geoDB.setMaintenanceStatus(_pendingMaintenanceToggleState, pwd, user);
    closeModal("modal-maintenance-toggle");

    if (_pendingMaintenanceToggleState) {
      showToast("️ Đã KÍCH HOẠT Chế Độ Bảo Trì thành công!", "success");
    } else {
      showToast(" Đã TẮT Chế Độ Bảo Trì, hệ thống đã hoạt động bình thường!", "success");
    }

    updateMaintenanceUI();
    if (appState.currentTab === "home") renderHomeView();
    if (appState.currentTab === "admin-panel") renderAdminDashboard();
  } catch (err) {
    showToast(err.message || "Mật khẩu bảo trì không đúng!", "error");
  }
}

function openChangeMaintenancePwdModal() {
  if (!window.geoAuth.isSuperAdmin()) {
    showToast("Chỉ có Nhà sáng tạo (Super Admin) mới có quyền đổi mật khẩu bảo trì!", "error");
    return;
  }
  document.getElementById("new-maint-pwd").value = "";
  document.getElementById("confirm-new-maint-pwd").value = "";
  openModal("modal-change-maintenance-pwd");
}

async function submitChangeMaintenancePwd(e) {
  if (e && e.preventDefault) e.preventDefault();
  const newPwd = document.getElementById("new-maint-pwd").value;
  const confirmPwd = document.getElementById("confirm-new-maint-pwd").value;

  if (newPwd !== confirmPwd) {
    showToast("Mật khẩu xác nhận không khớp!", "error");
    return;
  }

  try {
    await window.geoDB.changeMaintenancePassword(newPwd, window.geoAuth.currentUser);
    closeModal("modal-change-maintenance-pwd");
    showToast("Đã cập nhật Mật khẩu Bảo trì mới thành công!", "success");
  } catch (err) {
    showToast("Lỗi: " + err.message, "error");
  }
}

async function handleToggleMaintenanceDelegation(userId, targetEmail, allow) {
  const actionText = allow ? "ỦY QUYỀN bật/tắt chế độ bảo trì cho" : "THU HỒI quyền bật/tắt bảo trì của";
  if (!confirm(`Bạn có chắc chắn muốn ${actionText} quản trị viên ${targetEmail} không?`)) {
    return;
  }

  try {
    await window.geoAuth.toggleMaintenanceDelegation(userId, allow);
    showToast(`Đã ${allow ? 'ủy quyền' : 'thu hồi ủy quyền'} quản lý bảo trì cho ${targetEmail} thành công!`, "success");
    renderAdminDashboard();
  } catch (err) {
    showToast("Lỗi: " + err.message, "error");
  }
}

// --- DEVELOPER SYSTEM CONTROLS CONTROLLER ---
function updateDeveloperControlsUI() {
  const isDev = window.geoAuth ? (window.geoAuth.isDeveloper && window.geoAuth.isDeveloper()) : false;
  const devCard = document.getElementById("developer-admin-card");
  if (devCard) {
    devCard.style.display = isDev ? "block" : "none";
  }

  const settings = window.geoDB ? window.geoDB.getDeveloperSettings() : { disableGoogleLogin: false, disableAiMode: false };
  const googleToggle = document.getElementById("toggle-dev-google-login");
  const aiToggle = document.getElementById("toggle-dev-ai-mode");
  const googleDesc = document.getElementById("dev-google-login-status-desc");
  const aiDesc = document.getElementById("dev-ai-mode-status-desc");

  if (googleToggle) {
    googleToggle.checked = Boolean(settings.disableGoogleLogin);
  }
  if (googleDesc) {
    googleDesc.textContent = (window.t ? window.t("devToggleGoogleDesc", "Khi bat: Nguoi dung bam dang nhap Google se nhan thong bao Google dang bi loi.") : "Khi bat: Nguoi dung bam dang nhap Google se nhan thong bao Google dang bi loi.");
  }

  if (aiToggle) {
    aiToggle.checked = !Boolean(settings.disableAiMode);
  }
  if (aiDesc) {
    aiDesc.textContent = (window.t ? window.t("devToggleAiDesc", "Khi tat: Man hinh AI hien thong bao bao tri.") : "Khi tat: Man hinh AI hien thong bao bao tri.");
  }
}

async function handleToggleGoogleLogin(isDisabled) {
  const user = window.geoAuth ? window.geoAuth.getCurrentUser() : null;
  const isDev = window.geoAuth ? (window.geoAuth.isDeveloper && window.geoAuth.isDeveloper()) : false;
  if (!isDev) {
    showToast("Chỉ tài khoản Nhà phát triển / Quản trị viên mới có quyền thao tác!", "error");
    updateDeveloperControlsUI();
    return;
  }

  try {
    await window.geoDB.setGoogleLoginDisabled(isDisabled, user?.name || user?.email || "Nhà phát triển");
    if (isDisabled) {
      showToast("Đã BẬT chế độ từ chối đăng nhập Google (Báo lỗi cho người dùng)!", "info");
    } else {
      showToast("Đã CHO PHÉP đăng nhập Google bình thường!", "success");
    }
    updateDeveloperControlsUI();
  } catch (err) {
    showToast("Lỗi cập nhật: " + err.message, "error");
    updateDeveloperControlsUI();
  }
}

async function handleToggleAiMode(isActive) {
  const user = window.geoAuth ? window.geoAuth.getCurrentUser() : null;
  const isDev = window.geoAuth ? (window.geoAuth.isDeveloper && window.geoAuth.isDeveloper()) : false;
  if (!isDev) {
    showToast("Chỉ tài khoản Nhà phát triển / Quản trị viên mới có quyền thao tác!", "error");
    updateDeveloperControlsUI();
    return;
  }

  const isAiDisabled = !isActive;
  try {
    await window.geoDB.setAiDisabled(isAiDisabled, user?.name || user?.email || "Nhà phát triển");
    if (isAiDisabled) {
      showToast("Đã TẮT chế độ AI (Chuyển sang màn hình bảo trì & Mini-game Khủng Long)!", "info");
    } else {
      showToast("Đã BẬT chế độ AI hoạt động bình thường!", "success");
    }
    updateDeveloperControlsUI();
  } catch (err) {
    showToast("Lỗi cập nhật: " + err.message, "error");
    updateDeveloperControlsUI();
  }
}

// --- UTILITY: ESCAPE HTML ---
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- MANDATORY AUTH GATE OVERLAY CONTROLLER ---
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
    // Restore body scroll if no modal is active
    const openModals = document.querySelectorAll(".modal-backdrop.show");
    if (openModals.length === 0) {
      document.body.style.overflow = "";
    }
  } else {
    document.documentElement.classList.remove("geo-logged-in");
    document.documentElement.classList.add("geo-guest-locked");
    overlay.style.display = "flex";
    overlay.classList.remove("hidden");
    closeAllModals();
    // Luon khoa cuon trang sau khi closeAllModals
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
  if (window._isSubmittingGateLogin) return;
  window._isSubmittingGateLogin = true;

  const emailInput = document.getElementById("gate-login-email");
  const pwdInput = document.getElementById("gate-login-password");
  const submitBtn = document.getElementById("btn-gate-login-submit");

  const email = emailInput ? emailInput.value.trim() : "";
  const password = pwdInput ? pwdInput.value : "";

  if (!email || !password) {
    window._isSubmittingGateLogin = false;
    showToast("Vui lòng nhập đầy đủ Gmail và Mật khẩu!", "error");
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

    // Kiểm tra bảo mật khi hệ thống đang trong Chế Độ Bảo Trì
    const isMaint = window.geoDB ? window.geoDB.isMaintenanceActive() : false;
    if (isMaint) {
      const userRole = (user.role || "").toLowerCase();
      const userType = user.userType || "";
      const userEmail = (user.email || "").toLowerCase().trim();
      const isUserAdmin = (userRole === "admin" || userType === "Admin" || userEmail === "vut510624@gmail.com" || userEmail === "hshk.project@gmail.com");
      
      if (!isUserAdmin) {
        await window.geoAuth.logout();
        updateMaintenanceUI();
        showToast("Hệ thống đang trong Chế Độ Bảo Trì! Chỉ tài khoản Quản trị viên (Admin) mới có quyền đăng nhập.", "error");
        return;
      }
    }

    if (emailInput) emailInput.value = "";
    if (pwdInput) pwdInput.value = "";
    try {
      updateAuthUI();
      checkAuthGate();
      if (typeof switchTab === "function") {
        switchTab("home");
      }
    } catch (uiErr) {
      console.warn("[Auth] UI update notice:", uiErr);
    }
    showToast(`Đăng nhập thành công! Chào mừng ${user.name} đến với Geography Edu.`, "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    window._isSubmittingGateLogin = false;
    if (safetyTimer) clearTimeout(safetyTimer);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  }
}

// Pending Registration Data Holder for Anti-Bot Verification
window._pendingRegistrationData = null;
const ROBOT_CHALLENGE_CODE = "M%@vs2hShK";

async function submitAuthGateRegister(e) {
  if (typeof GeoAuthGateModule !== "undefined" && typeof GeoAuthGateModule.submitAuthGateRegister === "function") {
    return GeoAuthGateModule.submitAuthGateRegister(e);
  }
}
window.submitAuthGateRegister = submitAuthGateRegister;

async function submitModalRegister(e) {
  if (typeof GeoAuthGateModule !== "undefined" && typeof GeoAuthGateModule.submitModalRegister === "function") {
    return GeoAuthGateModule.submitModalRegister(e);
  }
}
window.submitModalRegister = submitModalRegister;

async function submitModalLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (window._isSubmittingModalLogin) return;
  window._isSubmittingModalLogin = true;

  const formLogin = document.getElementById("form-login");
  const emailInput = document.getElementById("login-email");
  const pwdInput = document.getElementById("login-password");
  const submitBtn = formLogin ? formLogin.querySelector("button[type='submit']") : null;

  const email = emailInput ? emailInput.value.trim() : "";
  const password = pwdInput ? pwdInput.value : "";

  if (!email || !password) {
    window._isSubmittingModalLogin = false;
    showToast("Vui lòng nhập đầy đủ Gmail và Mật khẩu!", "error");
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

    // Kiểm tra bảo mật khi hệ thống đang trong Chế Độ Bảo Trì
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

    closeModal("modal-login");
    try {
      updateAuthUI();
      checkAuthGate();
      if (typeof switchTab === "function") {
        switchTab("home");
      }
    } catch (uiErr) {
      console.warn("[Auth] Modal UI update notice:", uiErr);
    }
    showToast(`Đăng nhập thành công! Xin chào ${user.name}.`, "success");
    if (formLogin) formLogin.reset();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    window._isSubmittingModalLogin = false;
    if (safetyTimer) clearTimeout(safetyTimer);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  }
}
window.submitModalLogin = submitModalLogin;

function cancelGateRobotVerification() {
  if (typeof GeoAuthGateModule !== "undefined" && typeof GeoAuthGateModule.cancelGateRobotVerification === "function") {
    return GeoAuthGateModule.cancelGateRobotVerification();
  }
  window._pendingRegistrationData = null;
  switchAuthGateTab("register");
  showToast("Đã quay lại form đăng ký tài khoản.", "info");
}
window.cancelGateRobotVerification = cancelGateRobotVerification;

// --- 3-CHOICE ROBOT VERIFICATION CONTROLLER (Có / Không / Chắc chắn có) ---
async function handleRobotVerificationChoice(choice) {
  if (typeof GeoAuthGateModule !== "undefined" && typeof GeoAuthGateModule.handleRobotVerificationChoice === "function") {
    return GeoAuthGateModule.handleRobotVerificationChoice(choice);
  }
}
window.handleRobotVerificationChoice = handleRobotVerificationChoice;

// Legacy fallback helper for form submission
async function submitGateRobotVerification(e) {
  if (e && e.preventDefault) e.preventDefault();
  handleRobotVerificationChoice("no");
}

function cancelRobotVerification() {
  if (typeof GeoAuthGateModule !== "undefined" && typeof GeoAuthGateModule.cancelRobotVerification === "function") {
    return GeoAuthGateModule.cancelRobotVerification();
  }
  const isFromModal = window._pendingRegistrationData && window._pendingRegistrationData.source === "modal";
  window._pendingRegistrationData = null;
  closeModal("modal-robot-verification");
  if (isFromModal) {
    openModal("modal-register");
  } else {
    switchAuthGateTab("register");
  }
  showToast("Đã quay lại form đăng ký tài khoản.", "info");
}
window.cancelRobotVerification = cancelRobotVerification;

async function submitRobotVerification(e) {
  if (e && e.preventDefault) e.preventDefault();
  handleRobotVerificationChoice("no");
}

async function handleGoogleLoginGate() {
  try {
    const user = await window.geoAuth.loginWithGoogle();

    // Kiểm tra bảo mật khi hệ thống đang trong Chế Độ Bảo Trì
    const isMaint = window.geoDB ? window.geoDB.isMaintenanceActive() : false;
    if (isMaint) {
      const userRole = (user.role || "").toLowerCase();
      const userType = user.userType || "";
      const userEmail = (user.email || "").toLowerCase().trim();
      const isUserAdmin = (userRole === "admin" || userType === "Admin" || userEmail === "vut510624@gmail.com" || userEmail === "hshk.project@gmail.com");
      
      if (!isUserAdmin) {
        await window.geoAuth.logout();
        updateMaintenanceUI();
        showToast("Hệ thống đang trong Chế Độ Bảo Trì! Chỉ tài khoản Quản trị viên (Admin) mới có quyền đăng nhập.", "error");
        return;
      }
    }

    updateAuthUI();
    checkAuthGate();
    showToast(`Đăng nhập Google thành công! Chào mừng ${user.name}.`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- MOBILE NAVIGATION CONTROLLER ---
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

window.toggleMobileNav = toggleMobileNav;
window.closeMobileNav = closeMobileNav;

// --- AUTH UI SYNC ---
function updateAuthUI() {
  const user = window.geoAuth.currentUser;
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
      const userRoleText = user.userType || "Học sinh THCS";
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

  updateSavedBadgeCounter();
  updateMaintenanceUI();
  updateExamHubUI();
  checkAuthGate();
  renderExamCountdown();
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
  // Instant fast check on DOM load
  checkAuthGate();
  initTheme();

  // 0. Wait for Firestore data to be ready
  try {
    await window.geoDB.ready();
    console.log("[App] Firestore data ready, rendering UI...");
  } catch (err) {
    console.error("[App] Firestore init error:", err);
  }

  // 0B. Validate user session with Firestore (immediate forced logout if account was deleted)
  if (window.geoAuth && typeof window.geoAuth.validateCurrentSession === "function") {
    try {
      await window.geoAuth.validateCurrentSession();
    } catch(e) {}
  }

  // 1. Initial State UI & Language
  if (window.geoI18n) window.geoI18n.applyTranslations();
  initExamCountdown();
  updateAuthUI();
  renderHomeView();
  renderDocumentsView();
  renderContactView();

  // 2. Auth State Listener
  window.addEventListener("geo_auth_state_changed", () => {
    updateAuthUI();
    renderHomeView();
    renderDocumentsView();
    if (appState.currentTab === "saved") renderSavedDocumentsView();
    if (appState.currentTab === "contact") renderContactView();
    if (appState.currentTab === "admin-panel") renderAdminDashboard();
  });

  // 3. Navigation Clicks
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = link.getAttribute("data-tab");
      if (tab) switchTab(tab);
      closeMobileNav();
    });
  });

  // Close mobile nav when clicking anywhere outside or pressing Escape
  document.addEventListener("click", (e) => {
    const navMenu = document.getElementById("nav-menu");
    const mobileToggle = document.getElementById("mobile-nav-toggle");
    if (navMenu && navMenu.classList.contains("open")) {
      if (!navMenu.contains(e.target) && (!mobileToggle || !mobileToggle.contains(e.target))) {
        closeMobileNav();
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileNav();
    }
  });

  // 4. Document Filter Tabs
  document.querySelectorAll(".cat-main-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".cat-main-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      appState.docFilter.mainCat = this.getAttribute("data-main-cat");
      renderDocumentsView();
    });
  });

  document.querySelectorAll(".cat-sub-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".cat-sub-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      appState.docFilter.subCat = this.getAttribute("data-sub-cat");
      renderDocumentsView();
    });
  });

  // Search input - Google-style với real-time + nút × + nút tìm kiếm
  const searchInput = document.getElementById("doc-search-input");
  const clearBtn = document.getElementById("doc-search-clear");
  const searchBtn = document.getElementById("doc-search-btn");

  function doSearch(query) {
    appState.docFilter.searchQuery = query;
    renderDocumentsView();
    // Hiển thị / ẩn nút ×
    if (clearBtn) {
      clearBtn.style.display = query.trim() ? "flex" : "none";
    }
  }

  if (searchInput) {
    // Real-time tìm kiếm khi gõ
    searchInput.addEventListener("input", (e) => {
      doSearch(e.target.value);
    });

    // Nhấn Enter để tìm kiếm
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch(searchInput.value);
        searchInput.blur();
      }
    });
  }

  // Nút tìm kiếm
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      if (searchInput) doSearch(searchInput.value);
    });
  }

  // Nút × xóa tìm kiếm
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      doSearch("");
      if (searchInput) searchInput.focus();
    });
  }

  // 5. Star Rating Interactive Events
  document.querySelectorAll(".star-rating-input .star-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      const val = parseInt(this.getAttribute("data-value"), 10);
      updateStarInputDisplay(val);
    });
    btn.addEventListener("mouseenter", function () {
      const val = parseInt(this.getAttribute("data-value"), 10);
      document.querySelectorAll(".star-rating-input .star-btn").forEach(s => {
        const sVal = parseInt(s.getAttribute("data-value"), 10);
        if (sVal <= val) s.classList.add("hovered");
        else s.classList.remove("hovered");
      });
    });
    btn.addEventListener("mouseleave", function () {
      document.querySelectorAll(".star-rating-input .star-btn").forEach(s => s.classList.remove("hovered"));
    });
  });

  // 6. Auth Forms
  // Register Form
  const formRegister = document.getElementById("form-register");
  if (formRegister && !formRegister.onsubmit) {
    formRegister.addEventListener("submit", submitModalRegister);
  }

  // Login Form
  const formLogin = document.getElementById("form-login");
  if (formLogin && !formLogin.onsubmit) {
    formLogin.addEventListener("submit", submitModalLogin);
  }

  // (confession form listener moved to synchronous DOMContentLoaded below)

  // Form Submissions for Admin CRUD
  const formPostCrud = document.getElementById("form-post-crud");
  if (formPostCrud) formPostCrud.addEventListener("submit", handleSavePost);

  const formDocCrud = document.getElementById("form-doc-crud");
  if (formDocCrud) formDocCrud.addEventListener("submit", handleSaveDocument);

  const formContactCrud = document.getElementById("form-contact-crud");
  if (formContactCrud) formContactCrud.addEventListener("submit", handleSaveContactInfo);

  const formAddAdmin = document.getElementById("form-add-admin");
  if (formAddAdmin) formAddAdmin.addEventListener("submit", handleSaveAdmin);

  const formReplyConfession = document.getElementById("form-reply-confession");
  if (formReplyConfession) formReplyConfession.addEventListener("submit", handleSaveConfessionReply);

  const formChangePassword = document.getElementById("form-change-password");
  if (formChangePassword) formChangePassword.addEventListener("submit", handleChangePassword);

  // Close modals on clicking background or close buttons (except exam room which requires confirmation)
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", function (e) {
      if (e.target === this) {
        if (this.id === "modal-exam-room") return;
        closeAllModals();
      }
    });
  });

  document.querySelectorAll(".modal-close-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      if (this.closest("#modal-exam-room")) return;
      closeAllModals();
    });
  });
});

// ===== CONFESSION / FEEDBACK FORM: Registered immediately (no Firestore wait) =====
// This must NOT be inside the async DOMContentLoaded block to ensure the form
// always works even if Firestore is slow or still loading.

function checkConfessionRateLimit() {
  const STORAGE_KEY = "geo_cfs_rate_limit";
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  let timestamps = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) timestamps = JSON.parse(raw);
  } catch (e) { timestamps = []; }

  timestamps = timestamps.filter(ts => now - ts < ONE_HOUR);

  if (timestamps.length >= 5) {
    const oldest = timestamps[0];
    const minutesLeft = Math.ceil((ONE_HOUR - (now - oldest)) / 60000);
    throw new Error(`Ban da gui toi da 5 cau hoi/confession trong 1 gio qua. Vui long doi them ${minutesLeft} phut nua.`);
  }

  return {
    record: () => {
      timestamps.push(now);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps)); } catch (e) { }
    }
  };
}

// --- 5-SECOND COOLDOWN & 10-CHAR MINIMUM FOR CONFESSIONS ---
let _confessionCooldownSeconds = 0;
let _confessionCooldownTimer = null;
let _origSubmitFeedbackBtnHtml = "";
let _isSubmittingConfession = false;

function startConfessionCooldown(seconds = 5) {
  const submitBtn = document.getElementById("btn-submit-feedback");
  if (!submitBtn) return;

  if (_confessionCooldownTimer) {
    clearInterval(_confessionCooldownTimer);
    _confessionCooldownTimer = null;
  }

  _confessionCooldownSeconds = seconds;
  submitBtn.disabled = true;
  submitBtn.classList.add("btn-cooldown");

  const updateCountdownBtn = (sec) => {
    if (!submitBtn) return;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:middle;">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>Gui lai sau (${sec}s)...</span>
    `;
  };

  updateCountdownBtn(_confessionCooldownSeconds);

  _confessionCooldownTimer = setInterval(() => {
    _confessionCooldownSeconds--;
    if (_confessionCooldownSeconds > 0) {
      updateCountdownBtn(_confessionCooldownSeconds);
    } else {
      clearInterval(_confessionCooldownTimer);
      _confessionCooldownTimer = null;
      _confessionCooldownSeconds = 0;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("btn-cooldown");
        if (_origSubmitFeedbackBtnHtml) {
          submitBtn.innerHTML = _origSubmitFeedbackBtnHtml;
        } else {
          submitBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span data-i18n="btnSendConfession">Gui Cau Hoi Den Admin</span>
          `;
        }
        if (window.geoI18n && typeof window.geoI18n.translatePage === "function") {
          window.geoI18n.translatePage();
        }
      }
    }
  }, 1000);
}

async function submitConfessionForm(e) {
  if (e) {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  }

  // 1. Chong gui trung lap / dong thoi (Concurrent lock)
  if (_isSubmittingConfession) {
    console.warn("[Confession] Yeu cau dang duoc xu ly, bo qua lan submit trung.");
    return;
  }

  const submitBtn = document.getElementById("btn-submit-feedback");
  const formContactFeedback = document.getElementById("form-contact-feedback");

  // 2. Chống gửi liên tục (Cooldown 5 giây)
  if (_confessionCooldownSeconds > 0) {
    showToast(`Vui long doi ${_confessionCooldownSeconds} giay nua de tiep tuc gui confession!`, "warning");
    return;
  }

  // 3. Honeypot Bot Trap
  const honeypotVal = document.getElementById("feedback-hp-check")?.value;
  if (honeypotVal) {
    console.warn("[Security] Bot detected via Honeypot. Request cancelled.");
    if (formContactFeedback) formContactFeedback.reset();
    showToast("Cau hoi cua ban da duoc tiep nhan!", "success");
    return;
  }

  // 4. Yêu cầu nội dung ít nhất 10 ký tự
  const textarea = document.getElementById("feedback-message");
  const message = textarea ? textarea.value.trim() : "";
  if (!message) {
    showToast("Vui long nhap noi dung cau hoi hoac confession!", "error");
    if (textarea) textarea.focus();
    return;
  }
  if (message.length < 10) {
    showToast("Noi dung confession phai co it nhat 10 ky tu!", "error");
    if (textarea) textarea.focus();
    return;
  }

  // 5. Kiểm tra giới hạn 5 confession / giờ
  let rateLimit;
  try {
    rateLimit = checkConfessionRateLimit();
  } catch (err) {
    showToast(err.message, "error");
    return;
  }

  _isSubmittingConfession = true;

  if (submitBtn && !_origSubmitFeedbackBtnHtml) {
    _origSubmitFeedbackBtnHtml = submitBtn.innerHTML;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="btn-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span>
      <span>Dang gui cau hoi...</span>
    `;
  }

  try {
    await window.geoDB.saveConfession({
      senderName: "Hoc sinh",
      senderEmail: "",
      category: "Hoi dap",
      subject: message.length > 60 ? message.substring(0, 60) + "..." : message,
      message: message,
      isAnonymous: true
    });

    if (rateLimit && typeof rateLimit.record === "function") {
      rateLimit.record();
    }

    showToast("Cau hoi cua ban da duoc gui thanh cong den Admin!", "success");
    if (formContactFeedback) formContactFeedback.reset();
    const charCountEl = document.getElementById("feedback-char-count");
    if (charCountEl) {
      charCountEl.textContent = "0 ky tu";
      charCountEl.style.color = "var(--text-muted)";
    }

    if (typeof renderContactView === "function") renderContactView();
    if (window.geoAuth && window.geoAuth.isAdmin && window.geoAuth.isAdmin()) {
      if (typeof renderAdminDashboard === "function") renderAdminDashboard();
    }

    // Bắt đầu đếm ngược 5 giây trên nút gửi
    startConfessionCooldown(5);

  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (_origSubmitFeedbackBtnHtml) submitBtn.innerHTML = _origSubmitFeedbackBtnHtml;
    }
    showToast("Loi khi gui: " + err.message, "error");
  } finally {
    _isSubmittingConfession = false;
  }
}
window.submitConfessionForm = submitConfessionForm;

document.addEventListener("DOMContentLoaded", () => {
  // Contact & Confession Form Submission
  const formContactFeedback = document.getElementById("form-contact-feedback");
  if (formContactFeedback) {
    formContactFeedback.onsubmit = submitConfessionForm;
  }

  // Real-time character counter for confession message
  const feedbackMessage = document.getElementById("feedback-message");
  const charCount = document.getElementById("feedback-char-count");
  if (feedbackMessage && charCount) {
    feedbackMessage.addEventListener("input", () => {
      const len = feedbackMessage.value.trim().length;
      charCount.textContent = `${len} ky tu`;
      if (len < 10) {
        charCount.style.color = "var(--danger, #ef4444)";
      } else {
        charCount.style.color = "var(--primary, #0d9488)";
      }
    });
  }
});

// ===== REAL-TIME UPDATE: Firestore onSnapshot listeners =====
// Replaces both localStorage storage events AND polling.
// Firestore listeners in data.js dispatch 'firestore_data_changed' events.
window.addEventListener("firestore_data_changed", (e) => {
  const collection = e.detail && e.detail.collection;
  if (!collection) return;

  // Khi dữ liệu tài liệu thay đổi
  if (collection === "documents") {
    if (appState.currentTab === "documents") renderDocumentsView();
    if (appState.currentTab === "saved") renderSavedDocumentsView();
    updateStatsCounters();
  }
  // Khi bài viết trang chủ thay đổi
  if (collection === "hshk_posts" || collection === "group_posts") {
    if (appState.currentTab === "home") renderHomeView();
  }
  // Khi user list thay đổi (admin thêm/xóa tk)
  if (collection === "users") {
    if (appState.currentTab === "home" || appState.currentTab === "admin-panel") renderAdminDashboard();
    updateStatsCounters();
  }
  // Khi saved docs thay đổi
  if (collection === "saved_docs") {
    updateSavedBadgeCounter();
    if (appState.currentTab === "saved") renderSavedDocumentsView();
  }
  // Khi contact info thay đổi
  if (collection === "contact_info") {
    if (appState.currentTab === "contact") renderContactView();
  }
  // Khi confessions / hỏi đáp thay đổi
  if (collection === "confessions") {
    if (appState.currentTab === "contact") renderContactView();
    if (appState.currentTab === "admin-panel") renderAdminDashboard();
  }
  // Khi chế độ bảo trì thay đổi
  if (collection === "maintenance") {
    updateMaintenanceUI();
    if (appState.currentTab === "home") renderHomeView();
    if (appState.currentTab === "admin-panel") renderAdminDashboard();
  }
});

// Listener trực tiếp cho sự kiện bảo trì
window.addEventListener("maintenance_state_changed", () => {
  updateMaintenanceUI();
  if (appState.currentTab === "home") renderHomeView();
  if (appState.currentTab === "admin-panel") renderAdminDashboard();
});

// Listener trực tiếp cho sự kiện cài đặt nhà phát triển
window.addEventListener("developer_settings_changed", () => {
  updateDeveloperControlsUI();
  if (appState.currentTab === "admin-panel") renderAdminDashboard();
  if (appState.currentTab === "ai-chat" && typeof initAiChat === "function") initAiChat();
});

window.addEventListener("google_login_state_changed", () => {
  updateDeveloperControlsUI();
});

window.addEventListener("ai_mode_state_changed", () => {
  updateDeveloperControlsUI();
  if (appState.currentTab === "ai-chat" && typeof initAiChat === "function") initAiChat();
});

// ===== PDF UPLOAD UTILITIES =====
// Extend appState with pending PDF state
appState.pendingPdfBase64 = null;
appState.pendingPdfFileName = null;
appState.pendingPdfSize = null;
appState.pendingPdfFile = null;

function clearPdfUpload() {
  appState.pendingPdfBase64 = null;
  appState.pendingPdfFileName = null;
  appState.pendingPdfSize = null;
  appState.pendingPdfFile = null;
  const fileInput = document.getElementById("doc-pdf-file-input");
  if (fileInput) fileInput.value = "";
  const infoDiv = document.getElementById("pdf-file-info");
  if (infoDiv) infoDiv.style.display = "none";
  const zone = document.getElementById("pdf-upload-zone");
  if (zone) zone.classList.remove("dragover", "has-file");
}

function handlePdfFile(file) {
  if (!file || file.type !== "application/pdf") {
    showToast("Chỉ chấp nhận file định dạng PDF!", "error");
    return;
  }
  const MAX_MB = 25; // Nâng hạn mức lên 25 MB nhờ Cloud Storage chuyên dụng
  if (file.size > MAX_MB * 1024 * 1024) {
    showToast(`File PDF quá lớn (${(file.size / (1024 * 1024)).toFixed(2)} MB)! Giới hạn tối đa là ${MAX_MB} MB. Vui lòng nén file hoặc dùng hình thức 'Gắn Link trực tiếp'!`, "error");
    return;
  }

  showToast("Đang đọc tệp PDF...", "info");
  appState.pendingPdfFile = file;

  const reader = new FileReader();
  reader.onload = function (ev) {
    appState.pendingPdfBase64 = ev.target.result;
    appState.pendingPdfFileName = file.name;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeKB = (file.size / 1024).toFixed(0);
    appState.pendingPdfSize = parseFloat(sizeMB) >= 0.1 ? `${sizeMB} MB` : `${sizeKB} KB`;

    // Auto-fill size and format fields
    const sizeField = document.getElementById("doc-form-size");
    if (sizeField) sizeField.value = appState.pendingPdfSize;
    const formatField = document.getElementById("doc-form-format");
    if (formatField) formatField.value = "PDF";

    // Update UI
    const nameEl = document.getElementById("pdf-file-name");
    const sizeEl = document.getElementById("pdf-file-size");
    const infoDiv = document.getElementById("pdf-file-info");
    const zone = document.getElementById("pdf-upload-zone");
    const existingInfo = document.getElementById("pdf-existing-info");

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = appState.pendingPdfSize;
    if (infoDiv) infoDiv.style.display = "flex";
    if (zone) zone.classList.add("has-file");
    if (existingInfo) existingInfo.style.display = "none";

    showToast(`Đã chọn: ${file.name} (${appState.pendingPdfSize})`, "success");
  };
  reader.onerror = () => showToast("Không thể đọc file. Vui lòng thử lại!", "error");
  reader.readAsDataURL(file);
}

// Init PDF upload listeners
document.addEventListener("DOMContentLoaded", () => {
  const pdfInput = document.getElementById("doc-pdf-file-input");
  if (pdfInput) {
    pdfInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) handlePdfFile(e.target.files[0]);
    });
  }

  const zone = document.getElementById("pdf-upload-zone");
  if (zone) {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handlePdfFile(file);
    });
  }
});

// --- ADMIN REAL-TIME ANALYTICS DASHBOARD (so lieu thuc te) ---
function renderAdminAnalytics() {
  const docs = window.geoDB ? window.geoDB.getDocuments() : [];
  let totalViews = 0;
  let totalDownloads = 0;
  let totalSearches = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  docs.forEach(d => {
    totalViews += Number(d.views) || 0;
    totalDownloads += Number(d.downloads) || 0;
    totalSearches += Number(d.searches) || 0;
    if (d.avgRating) {
      ratingSum += Number(d.avgRating);
      ratingCount++;
    }
  });

  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : "5.0";

  const vEl = document.getElementById("adm-stat-total-views");
  const dEl = document.getElementById("adm-stat-total-downloads");
  const rEl = document.getElementById("adm-stat-avg-rating");
  if (vEl) vEl.textContent = totalViews.toLocaleString("vi-VN");
  if (dEl) dEl.textContent = totalDownloads.toLocaleString("vi-VN");
  if (rEl) rEl.textContent = `${avgRating} / 5.0`;

  // Top 10 tai lieu theo diem quan tam thuc te (view * 2 + download * 3 + searches * 1)
  const sortedDocs = [...docs].sort((a, b) => {
    const scoreA = (Number(a.views) || 0) * 2 + (Number(a.downloads) || 0) * 3 + (Number(a.searches) || 0);
    const scoreB = (Number(b.views) || 0) * 2 + (Number(b.downloads) || 0) * 3 + (Number(b.searches) || 0);
    return scoreB - scoreA;
  }).slice(0, 10);

  const tbody = document.getElementById("admin-analytics-table-body");
  if (!tbody) return;

  // Cap nhat toolbar count
  const analyticsToolbarCount = document.getElementById("admin-analytics-toolbar-count");
  if (analyticsToolbarCount) {
    analyticsToolbarCount.textContent = `Top ${sortedDocs.length} tai lieu thuc te (xem: ${totalViews.toLocaleString("vi-VN")}, tai: ${totalDownloads.toLocaleString("vi-VN")})`;
  }

  if (sortedDocs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 28px 16px;">Chua co du lieu thong ke thuc te. Khi nguoi dung xem va tai tai lieu, so lieu se tu dong cap nhat.</td></tr>`;
    return;
  }

  tbody.innerHTML = sortedDocs.map((d, idx) => {
    const views = Number(d.views) || 0;
    const downloads = Number(d.downloads) || 0;
    const searches = Number(d.searches) || 0;
    const score = views * 2 + downloads * 3 + searches;
    const mainCatLabel = d.mainCat === "dai_cuong" ? "Dia li dai cuong" : "Dia li Viet Nam";
    const subCatLabel = d.subCat === "tu_nhien" ? "Tu nhien" : "Kinh te - Xa hoi";
    const isDirectLink = Boolean(d.attachmentType === "link" || (d.externalUrl && !d.pdfBase64));
    const fmtBadge = isDirectLink
      ? `<span class="badge" style="background: rgba(37,99,235,0.12); color:#2563eb;">${d.format || 'DOCX'} (Link)</span>`
      : `<span class="badge badge-pdf-attached">File PDF</span>`;

    // Rank medal cho top 3
    let rankDisplay;
    if (idx === 0) rankDisplay = `<strong style="color:#f59e0b;">#1</strong>`;
    else if (idx === 1) rankDisplay = `<strong style="color:#94a3b8;">#2</strong>`;
    else if (idx === 2) rankDisplay = `<strong style="color:#cd7c2b;">#3</strong>`;
    else rankDisplay = `<strong style="color: var(--text-muted);">#${idx + 1}</strong>`;

    return `
      <tr>
        <td>${rankDisplay}</td>
        <td><strong>${escapeHtml(d.title)}</strong></td>
        <td style="font-size:0.82rem; color:var(--text-muted);">${mainCatLabel} - ${subCatLabel}</td>
        <td>${fmtBadge}</td>
        <td><strong style="color:#2563eb;">${views.toLocaleString("vi-VN")}</strong></td>
        <td><strong style="color:#0d9488;">${downloads.toLocaleString("vi-VN")}</strong></td>
        <td><strong style="color:#8b5cf6;">${searches.toLocaleString("vi-VN")}</strong></td>
        <td>${(d.avgRating || 5.0).toFixed(1)}/5</td>
      </tr>
    `;
  }).join("");
}

// --- DATABASE 1-CLICK BACKUP & RESTORE HANDLERS (Chi Super Admin) ---
function handleBackupDatabase() {
  if (!window.geoAuth || !window.geoAuth.isSuperAdmin()) {
    showToast("Khong co quyen truy cap. Chi Admin Tong moi co the thuc hien sao luu du lieu.", "error");
    return;
  }
  try {
    const backupJson = window.geoDB.backupAllData();
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `geography_edu_backup_${dateStr}.json`;
    a.click();
    showToast("Da xuat file sao luu du lieu (.JSON) thanh cong!", "success");
  } catch (err) {
    showToast("Loi khi sao luu du lieu: " + err.message, "error");
  }
}

async function handleRestoreDatabase(event) {
  if (!window.geoAuth || !window.geoAuth.isSuperAdmin()) {
    showToast("Khong co quyen truy cap. Chi Admin Tong moi co the khoi phuc du lieu.", "error");
    if (event.target) event.target.value = "";
    return;
  }

  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!confirm("CANH BAO: Qua trinh khoi phuc se ghi de va dong bo lai toan bo du lieu tu file sao luu. Ban co chac chan muon tiep tuc khong?")) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const content = e.target.result;
      await window.geoDB.restoreAllData(content);
      showToast("Da khoi phuc co so du lieu thanh cong!", "success");
      renderHomeView();
      renderDocumentsView();
      renderAdminDashboard();
      updateStatsCounters();
    } catch (err) {
      showToast("Loi khi khoi phuc du lieu: " + err.message, "error");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// --- NETWORK STATUS OFFLINE / ONLINE ENGINE ---
function updateNetworkStatusUI() {
  const banner = document.getElementById("network-status-banner");
  const text = document.getElementById("network-status-text");
  if (!banner) return;

  if (!navigator.onLine) {
    banner.style.display = "block";
    banner.className = "network-status-banner offline";
    if (text) text.textContent = "Bạn đang ở chế độ ngoại tuyến (Offline). Dữ liệu sẽ tự động đồng bộ khi có kết nối trở lại.";
  } else {
    if (banner.style.display !== "none" && banner.classList.contains("offline")) {
      banner.className = "network-status-banner online";
      if (text) text.textContent = "Đã khôi phục kết nối Internet! Dữ liệu đã được đồng bộ.";
      setTimeout(() => {
        banner.style.display = "none";
      }, 3500);
    }
  }
}
window.addEventListener("online", updateNetworkStatusUI);
window.addEventListener("offline", updateNetworkStatusUI);

// --- PWA SERVICE WORKER & APP INSTALL PROMPT ---
let deferredPwaPrompt = null;

if ("serviceWorker" in navigator) {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocalhost) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) reg.unregister();
    });
    if ("caches" in window) {
      caches.keys().then(names => {
        for (const name of names) caches.delete(name);
      });
    }
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=2.6.5").catch(() => { });
    });
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const installBtn = document.getElementById("btn-pwa-install");
  if (installBtn) installBtn.style.display = "inline-flex";
});

window.addEventListener("appinstalled", () => {
  deferredPwaPrompt = null;
  const installBtn = document.getElementById("btn-pwa-install");
  if (installBtn) installBtn.style.display = "none";
  showToast("Đã cài đặt ứng dụng Geography Edu thành công!", "success");
});

document.addEventListener("DOMContentLoaded", () => {
  const pwaBtn = document.getElementById("btn-pwa-install");
  if (pwaBtn) {
    pwaBtn.addEventListener("click", async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const choice = await deferredPwaPrompt.userChoice;
        if (choice.outcome === "accepted") {
          pwaBtn.style.display = "none";
        }
        deferredPwaPrompt = null;
      } else {
        showToast("Để cài đặt: Trên iOS nhấn Chia sẻ > 'Thêm vào MH chính'. Trên Android nhấn Menu 3 chấm > 'Cài đặt ứng dụng'.", "info");
      }
    });
  }
  updateNetworkStatusUI();
  updateImpersonationBanner();

  // Khởi động ngầm tính năng phân tích thiết bị (Tự động kiểm tra trạng thái Bật/Tắt)
  setTimeout(() => {
    if (typeof UserTelemetryEngine !== "undefined") {
      UserTelemetryEngine.reportTelemetry();
    }
  }, 2500);

  // Khởi tạo hệ thống Kiểm tra trực tuyến
  if (typeof initExamSystem === "function") {
    initExamSystem();
  }
});

// ==========================================================================
// ONLINE EXAM SYSTEM CONTROLLER (MÃ BÀI THI, KIOSK ANTI-CHEAT & ADMIN MANAGER)
// ==========================================================================

let currentExamSession = null;
let examTimerInterval = null;
let kioskExamHandlersBound = false;
let kioskSuppressBlurViolation = false;
let lastKioskViolationTimestamp = 0;
let pendingExamForGuest = null;

/**
 * Khởi tạo hệ thống kiểm tra trực tuyến và lắng nghe dữ liệu Firestore
 */
function initExamSystem() {
  updateExamHubUI();
  renderExamHubQuickChips();

  // Lắng nghe sự kiện thay đổi dữ liệu exams từ Firestore
  window.addEventListener("exams_data_changed", () => {
    updateExamHubUI();
    renderExamHubQuickChips();
    if (document.getElementById("modal-exam-admin")?.classList.contains("show")) {
      renderAdminExamsTable();
      renderExamSubmissionsTable();
    }
  });

  window.addEventListener("exam_submissions_changed", () => {
    updateExamHubUI();
    if (document.getElementById("modal-exam-admin")?.classList.contains("show")) {
      renderExamSubmissionsTable();
    }
  });

  // Lắng nghe thay đổi trạng thái đăng nhập để cập nhật quyền Admin
  window.addEventListener("auth_state_changed", () => {
    updateExamHubUI();
  });
}

/**
 * Cập nhật hiển thị các nút chức năng Admin / Developer tại Exam Hub
 */
function updateExamHubUI() {
  const adminActions = document.getElementById("exam-hub-admin-actions");
  if (!adminActions) return;

  const isAuth = window.geoAuth && window.geoAuth.isAuthenticated();
  const isAdmin = window.geoAuth && (window.geoAuth.isAdmin() || window.geoAuth.isDeveloper());

  // Chỉ hiển thị thanh chức năng nếu là Quản Trị Viên hoặc Nhà Phát Triển
  if (isAuth && isAdmin) {
    adminActions.style.display = "flex";
  } else {
    adminActions.style.display = "none";
  }

  // Cập nhật số lượng bài nộp
  const subsCountBadge = document.getElementById("exam-submissions-count");
  if (subsCountBadge && window.geoDB) {
    const allSubs = window.geoDB.getExamSubmissions();
    if (allSubs.length > 0 && isAuth && isAdmin) {
      subsCountBadge.textContent = allSubs.length;
      subsCountBadge.style.display = "inline-block";
    } else {
      subsCountBadge.style.display = "none";
    }
  }
}

/**
 * Cập nhật động danh sách chip mã đề thi gợi ý (Đã ẩn theo yêu cầu)
 */
function renderExamHubQuickChips() {
  const container = document.querySelector(".exam-hub-quick-chips");
  if (container) {
    container.innerHTML = "";
    container.style.display = "none";
  }
}

/**
 * Điền nhanh mã bài kiểm tra / khảo sát vào ô nhập liệu
 */
function quickFillExamCode(code) {
  const input = document.getElementById("exam-code-input");
  if (input) {
    input.value = code;
    input.focus();
    showToast(`Đã chọn mã: "${code}". Nhấn "Vào Phòng Thi" để bắt đầu!`, "info");
  }
}

/**
 * Xử lý khi thí sinh nhập mã bài kiểm tra và bấm "Vào Phòng Thi"
 */
function handleExamCodeSubmit(e) {
  if (e) e.preventDefault();

  const input = document.getElementById("exam-code-input");
  const code = input ? input.value.trim() : "";

  if (!code) {
    showToast("Vui lòng nhập mã bài kiểm tra hoặc phiếu khảo sát!", "warning");
    return;
  }

  if (!window.geoDB) {
    showToast("Hệ thống dữ liệu đang khởi động, vui lòng thử lại sau giây lát!", "info");
    return;
  }

  const exam = window.geoDB.getExamByCode(code);
  if (!exam) {
    showToast(`Mã kiểm tra "${code}" không tồn tại hoặc đã kết thúc! Vui lòng kiểm tra lại mã bài thi.`, "error");
    return;
  }

  const isAuth = window.geoAuth && window.geoAuth.isAuthenticated();
  if (!isAuth) {
    // Lưu tạm exam và hiển thị modal thông tin thí sinh để bắt đầu nhanh
    pendingExamForGuest = exam;
    const titleEl = document.getElementById("guest-exam-title");
    const codeEl = document.getElementById("guest-exam-code");
    const durationEl = document.getElementById("guest-exam-duration");
    if (titleEl) titleEl.textContent = exam.title;
    if (codeEl) codeEl.textContent = exam.code;
    if (durationEl) durationEl.textContent = `${exam.durationMinutes} phút`;

    openModal("modal-guest-exam-entry");
    return;
  }

  // Bắt đầu phiên làm bài kiểm tra khi đã đăng nhập
  startExamSession(exam);
}

/**
 * Xử lý khi học sinh chưa đăng nhập điền Họ Tên & Lớp để bắt đầu làm bài
 */
function handleGuestExamSubmit(e) {
  if (e) e.preventDefault();
  const nameInput = document.getElementById("guest-exam-student-name");
  const classInput = document.getElementById("guest-exam-student-class");
  const emailInput = document.getElementById("guest-exam-student-email");

  const name = nameInput ? nameInput.value.trim() : "";
  const schoolClass = classInput ? classInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim() : "";

  if (!name) {
    showToast("Vui lòng nhập Họ và Tên của bạn để bắt đầu làm bài!", "warning");
    return;
  }

  if (!pendingExamForGuest) {
    closeModal("modal-guest-exam-entry");
    return;
  }

  const guestInfo = {
    name: name,
    email: email || `${name.toLowerCase().replace(/\s+/g, '')}@khach.vn`,
    schoolClass: schoolClass ? (schoolClass.toLowerCase().startsWith("lớp") ? schoolClass : `Lớp ${schoolClass}`) : "Học sinh tự do",
    userType: "Học sinh"
  };

  const targetExam = pendingExamForGuest;
  pendingExamForGuest = null;
  closeModal("modal-guest-exam-entry");
  startExamSession(targetExam, guestInfo);
}

/**
 * Bắt đầu phiên thi & thiết lập phòng thi Kiosk
 */
function startExamSession(exam, guestInfo = null) {
  const user = guestInfo || (window.geoAuth ? window.geoAuth.getCurrentUser() : null);

  currentExamSession = {
    exam: exam,
    guestInfo: guestInfo,
    timeRemainingSeconds: (parseInt(exam.durationMinutes) || 15) * 60,
    startTime: Date.now(),
    violationsCount: 0,
    violationLogs: [],
    kioskActive: Boolean(exam.lockBrowser),
    autoSaveInterval: null
  };

  // 1. Cập nhật thông tin Header phòng thi
  const titleEl = document.getElementById("exam-room-title");
  const codeBadge = document.getElementById("exam-room-code-badge");
  const modeBadge = document.getElementById("exam-mode-badge");
  const lockPill = document.getElementById("exam-lock-status-pill");

  if (titleEl) titleEl.textContent = exam.title || "Bài Kiểm Tra";
  if (codeBadge) codeBadge.textContent = `MÃ: ${exam.code}`;

  const isViewOnly = exam.mode === "view_only";
  if (modeBadge) {
    modeBadge.textContent = isViewOnly ? "CHẾ ĐỘ CHỈ XEM ĐỀ" : "CHẾ ĐỘ XEM & LÀM BÀI";
    modeBadge.style.background = isViewOnly ? "rgba(59, 130, 246, 0.15)" : "rgba(13, 148, 136, 0.15)";
    modeBadge.style.color = isViewOnly ? "#2563eb" : "var(--primary)";
  }

  // Trạng thái Khóa trình duyệt
  if (lockPill) {
    lockPill.style.display = exam.lockBrowser ? "inline-flex" : "none";
  }

  // 2. Điền nội dung Đề bài
  const qContent = document.getElementById("exam-question-content");
  if (qContent) {
    qContent.textContent = exam.content || "Nội dung đề bài đang được cập nhật...";
  }

  // 3. Xử lý khung làm bài của học sinh
  const ansPanel = document.getElementById("exam-answer-panel");
  const submitBtn = document.getElementById("btn-submit-exam-action");
  const studentNameEl = document.getElementById("exam-student-name");
  const studentEmailEl = document.getElementById("exam-student-email");
  const textarea = document.getElementById("exam-student-answers");

  if (studentNameEl) studentNameEl.textContent = user ? user.name : "Thí sinh";
  if (studentEmailEl) studentEmailEl.textContent = user ? (user.email || user.schoolClass || "") : "";

  if (isViewOnly) {
    if (ansPanel) ansPanel.style.display = "none";
    if (submitBtn) submitBtn.style.display = "none";
  } else {
    if (ansPanel) ansPanel.style.display = "flex";
    if (submitBtn) submitBtn.style.display = "inline-flex";
    if (textarea) {
      // Phục hồi nháp nếu có
      const draftKey = `exam_draft_${exam.id}_${user ? user.email : "guest"}`;
      textarea.value = localStorage.getItem(draftKey) || "";
      handleExamAnswerInput();
    }
  }

  // Bỏ qua vi phạm mất tiêu điểm trong 2.5s đầu khi mở phòng thi
  kioskSuppressBlurViolation = true;
  setTimeout(() => { kioskSuppressBlurViolation = false; }, 2500);

  // 4. Mở modal phòng thi
  openModal("modal-exam-room");

  // 5. Khởi động Timer
  startExamTimer();

  // 6. Kích hoạt Kiosk Anti-cheat nếu bật khóa trình duyệt
  if (exam.lockBrowser) {
    activateKioskExamLock();
  }

  showToast(`Đã vào phòng thi "${exam.title}"! Thời gian: ${exam.durationMinutes} phút.`, "info");
}

/**
 * Đồng hồ đếm ngược thời gian thực
 */
function startExamTimer() {
  if (examTimerInterval) clearInterval(examTimerInterval);

  updateExamTimerDisplay();

  examTimerInterval = setInterval(() => {
    if (!currentExamSession) {
      clearInterval(examTimerInterval);
      return;
    }

    currentExamSession.timeRemainingSeconds--;

    updateExamTimerDisplay();

    // Cảnh báo khi còn 2 phút
    if (currentExamSession.timeRemainingSeconds === 120) {
      showToast("Chỉ còn 2 phút làm bài! Vui lòng chuẩn bị nộp bài.", "warning");
    }

    // Khi hết giờ -> Tự động nộp bài
    if (currentExamSession.timeRemainingSeconds <= 0) {
      clearInterval(examTimerInterval);
      showToast("Đã hết thời gian làm bài quy định! Hệ thống đang tự động gửi bài...", "warning");
      submitStudentExam(true);
    }
  }, 1000);
}

function updateExamTimerDisplay() {
  const display = document.getElementById("exam-timer-display");
  const timerCard = document.getElementById("exam-timer-card");
  if (!display || !currentExamSession) return;

  const total = Math.max(0, currentExamSession.timeRemainingSeconds);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Đổi màu cảnh báo đỏ khi còn < 3 phút
  if (timerCard) {
    if (total <= 180) {
      timerCard.classList.add("warning");
    } else {
      timerCard.classList.remove("warning");
    }
  }
}

/**
 * Đếm từ và tự động lưu nháp khi gõ bài làm
 */
function handleExamAnswerInput() {
  const textarea = document.getElementById("exam-student-answers");
  const counter = document.getElementById("exam-word-count");
  const autoSaveEl = document.getElementById("exam-autosave-indicator");
  if (!textarea) return;

  const text = textarea.value || "";
  const charCount = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  if (counter) {
    counter.textContent = `${words} từ • ${charCount} ký tự`;
  }

  // Tự động lưu nháp vào LocalStorage
  if (currentExamSession && currentExamSession.exam) {
    const user = window.geoAuth ? window.geoAuth.getCurrentUser() : null;
    const draftKey = `exam_draft_${currentExamSession.exam.id}_${user ? user.email : "guest"}`;
    try {
      localStorage.setItem(draftKey, text);
      if (autoSaveEl) {
        autoSaveEl.textContent = "● Đã lưu nháp";
        autoSaveEl.style.color = "var(--success)";
      }
    } catch (e) { }
  }
}

/**
 * KÍCH HOẠT CƠ CHẾ KHÓA TRÌNH DUYỆT (KIOSK ANTI-CHEAT)
 */
function activateKioskExamLock() {
  // 1. Đề nghị vào chế độ Fullscreen
  try {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
  } catch (e) { }

  if (kioskExamHandlersBound) return;
  kioskExamHandlersBound = true;

  // 2. Phát hiện chuyển tab / ẩn trang
  document.addEventListener("visibilitychange", onKioskVisibilityChange);

  // 3. Phát hiện mất tiêu điểm (chuyển sang ứng dụng khác)
  window.addEventListener("blur", onKioskWindowBlur);

  // 4. Phát hiện thoát Fullscreen
  document.addEventListener("fullscreenchange", onKioskFullscreenChange);

  // 5. Chặn chuột phải và phím tắt copy/paste
  document.addEventListener("contextmenu", onKioskContextMenu);
  document.addEventListener("keydown", onKioskKeyDown);
}

function deactivateKioskExamLock() {
  kioskExamHandlersBound = false;

  document.removeEventListener("visibilitychange", onKioskVisibilityChange);
  window.removeEventListener("blur", onKioskWindowBlur);
  document.removeEventListener("fullscreenchange", onKioskFullscreenChange);
  document.removeEventListener("contextmenu", onKioskContextMenu);
  document.removeEventListener("keydown", onKioskKeyDown);

  // Thoát Fullscreen nếu đang bật
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }
  } catch (e) { }

  const alertBox = document.getElementById("exam-violation-alert");
  if (alertBox) alertBox.style.display = "none";
}

function onKioskVisibilityChange() {
  if (kioskSuppressBlurViolation) return;
  if (currentExamSession && currentExamSession.kioskActive && document.hidden) {
    recordKioskViolation("Chuyển sang tab khác hoặc thu nhỏ trình duyệt");
  }
}

function onKioskWindowBlur() {
  if (kioskSuppressBlurViolation) return;
  if (currentExamSession && currentExamSession.kioskActive) {
    recordKioskViolation("Rời khỏi cửa sổ bài thi (mở ứng dụng khác)");
  }
}

function onKioskFullscreenChange() {
  if (kioskSuppressBlurViolation) return;
  if (currentExamSession && currentExamSession.kioskActive && !document.fullscreenElement) {
    recordKioskViolation("Thoát khỏi chế độ toàn màn hình");
  }
}

function onKioskContextMenu(e) {
  if (currentExamSession && currentExamSession.kioskActive) {
    e.preventDefault();
    showToast("Chế độ khóa phòng thi: Vô hiệu hóa chuột phải!", "warning");
  }
}

function onKioskKeyDown(e) {
  if (!currentExamSession || !currentExamSession.kioskActive) return;

  // Chặn F12 (DevTools)
  if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C"))) {
    e.preventDefault();
    recordKioskViolation("Cố gắng mở công cụ phát triển (DevTools)");
    return false;
  }

  // Chặn Alt + Tab / Windows key
  if (e.altKey && e.key === "Tab") {
    recordKioskViolation("Sử dụng tổ hợp phím Alt + Tab");
  }
}

/**
 * Ghi nhận vi phạm khóa trình duyệt và hiển thị cảnh báo đỏ
 */
function recordKioskViolation(reason) {
  if (!currentExamSession || kioskSuppressBlurViolation) return;

  const now = Date.now();
  if (now - lastKioskViolationTimestamp < 1500) return; // Khử sự kiện blur/visibilitychange trùng lặp
  lastKioskViolationTimestamp = now;

  currentExamSession.violationsCount++;
  const violationRecord = {
    time: new Date().toLocaleTimeString("vi-VN"),
    reason: reason,
    count: currentExamSession.violationsCount
  };
  currentExamSession.violationLogs.push(violationRecord);

  // Hiển thị banner cảnh báo
  const alertBox = document.getElementById("exam-violation-alert");
  const countEl = document.getElementById("exam-violation-count");
  const msgEl = document.getElementById("exam-violation-msg");

  if (alertBox) {
    alertBox.style.display = "flex";
    if (countEl) countEl.textContent = currentExamSession.violationsCount;
    if (msgEl) {
      msgEl.innerHTML = `Bạn vừa có hành vi: <em>${escapeHtml(reason)}</em>. Hành vi này đã được ghi lại (Lần <strong>${currentExamSession.violationsCount}</strong>) và sẽ gửi báo cáo trực tiếp tới Quản trị viên!`;
    }
  }

  showToast(`CẢNH BÁO VI PHẠM (Lần ${currentExamSession.violationsCount}): ${reason}!`, "error");
}

function dismissViolationAlert() {
  const alertBox = document.getElementById("exam-violation-alert");
  if (alertBox) alertBox.style.display = "none";
  // Thử đưa lại Fullscreen
  try {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
  } catch (e) { }
}

/**
 * Xác nhận thoát khỏi phòng thi
 */
function confirmExitExam() {
  if (!currentExamSession) {
    closeModal("modal-exam-room");
    return;
  }

  const isViewOnly = currentExamSession.exam.mode === "view_only";
  const msg = isViewOnly
    ? "Bạn có chắc chắn muốn thoát khỏi phòng xem đề thi không?"
    : "Bạn đang làm bài thi dở dang! Nếu thoát lúc này, bài làm của bạn sẽ không được nộp và có thể bị tính điểm 0. Bạn có chắc chắn muốn thoát?";

  kioskSuppressBlurViolation = true;
  let userConfirmed = false;
  try {
    userConfirmed = confirm(msg);
  } finally {
    setTimeout(() => { kioskSuppressBlurViolation = false; }, 1500);
  }

  if (userConfirmed) {
    cleanupExamSession();
    closeModal("modal-exam-room");
    showToast("Đã rời khỏi phòng thi!", "info");
  }
}

/**
 * Nộp bài kiểm tra của thí sinh và gửi tới Quản trị viên
 */
async function submitStudentExam(isAuto = false) {
  if (!currentExamSession) return;

  const user = window.geoAuth ? window.geoAuth.getCurrentUser() : null;
  const guest = currentExamSession.guestInfo;
  const textarea = document.getElementById("exam-student-answers");
  const answers = textarea ? textarea.value.trim() : "";

  if (!isAuto) {
    kioskSuppressBlurViolation = true;
    let userConfirmed = false;
    try {
      if (!answers && currentExamSession.exam.mode === "view_and_submit") {
        userConfirmed = confirm("Ô bài làm của bạn đang để trống! Bạn có chắc chắn muốn nộp bài không?");
      } else {
        userConfirmed = confirm("Bạn có chắc chắn muốn Nộp Bài Kiểm Tra ngay bây giờ không? Sau khi nộp bạn sẽ không thể chỉnh sửa bài làm.");
      }
    } finally {
      setTimeout(() => { kioskSuppressBlurViolation = false; }, 1500);
    }
    if (!userConfirmed) return;
  }

  const timeSpent = Math.max(1, Math.round((Date.now() - currentExamSession.startTime) / 1000));
  const exam = currentExamSession.exam;

  const payload = {
    examId: exam.id,
    examTitle: exam.title,
    examCode: exam.code,
    studentName: guest ? guest.name : (user ? (user.name || user.email) : "Thí sinh ẩn danh"),
    studentEmail: guest ? (guest.email || "") : (user ? user.email : ""),
    studentRole: guest ? (guest.schoolClass || "Học sinh") : (user ? (user.userType || user.role || "Học sinh") : "Học sinh"),
    answers: answers,
    timeSpentSeconds: timeSpent,
    violationsCount: currentExamSession.violationsCount || 0,
    violationLogs: currentExamSession.violationLogs || []
  };

  try {
    if (window.geoDB) {
      await window.geoDB.submitExam(payload);
    }

    // Xóa bản nháp sau khi nộp thành công
    const draftKey = `exam_draft_${exam.id}_${user ? user.email : (guest ? guest.name : "guest")}`;
    try {
      localStorage.setItem(draftKey, "");
      localStorage.removeItem(draftKey);
    } catch (e) { }

    const codeInput = document.getElementById("exam-code-input");
    if (codeInput) codeInput.value = "";

    cleanupExamSession();
    closeModal("modal-exam-room");

    let toastMsg = "Nộp bài kiểm tra thành công! Toàn bộ nội dung bài làm đã được chuyển tới Quản trị viên.";
    if (payload.violationsCount > 0) {
      toastMsg += ` (Lưu ý: Hệ thống đã ghi nhận ${payload.violationsCount} lần thoát màn hình/tab).`;
    }
    showToast(toastMsg, payload.violationsCount > 0 ? "warning" : "success");
  } catch (err) {
    showToast("Lỗi khi nộp bài kiểm tra: " + err.message, "error");
  }
}

function cleanupExamSession() {
  if (examTimerInterval) {
    clearInterval(examTimerInterval);
    examTimerInterval = null;
  }
  deactivateKioskExamLock();
  currentExamSession = null;
}

// ==========================================================================
// QUẢN LÝ BÀI KIỂM TRA & BÀI NỘP (DÀNH CHO GIÁO VIÊN & ADMIN)
// ==========================================================================

function openCreateExamModal() {
  const isAuth = window.geoAuth && window.geoAuth.isAuthenticated();
  const isAdmin = window.geoAuth && (window.geoAuth.isAdmin() || window.geoAuth.isDeveloper());

  if (!isAuth) {
    showToast("Vui lòng đăng nhập tài khoản Quản trị viên!", "info");
    openModal("modal-login");
    return;
  }

  if (!isAdmin) {
    showToast("Tính năng đăng bài kiểm tra chỉ dành cho Giáo viên & Ban Quản Trị!", "error");
    return;
  }

  // Reset form
  const form = document.getElementById("form-create-exam");
  if (form) form.reset();

  const lockInput = document.getElementById("exam-create-lock-browser");
  if (lockInput) lockInput.checked = true;

  openModal("modal-exam-create");
}

async function handleCreateExamSubmit(e) {
  if (e) e.preventDefault();

  const isAuth = window.geoAuth && window.geoAuth.isAuthenticated();
  const isAdmin = window.geoAuth && (window.geoAuth.isAdmin() || window.geoAuth.isDeveloper());

  if (!isAuth || !isAdmin) {
    showToast("Bạn không có quyền đăng đề thi trực tuyến!", "error");
    return;
  }

  const title = (document.getElementById("exam-create-title")?.value || "").trim();
  const code = (document.getElementById("exam-create-code")?.value || "").trim().toUpperCase();
  const duration = parseInt(document.getElementById("exam-create-duration")?.value) || 15;
  const mode = document.getElementById("exam-create-mode")?.value || "view_and_submit";
  const lockBrowser = Boolean(document.getElementById("exam-create-lock-browser")?.checked);
  const content = (document.getElementById("exam-create-content")?.value || "").trim();

  if (!title) {
    showToast("Vui lòng nhập tên / tiêu đề bài kiểm tra!", "warning");
    return;
  }

  if (!code) {
    showToast("Mã bài kiểm tra là bắt buộc!", "warning");
    return;
  }

  if (!content) {
    showToast("Vui lòng nhập nội dung đề bài kiểm tra!", "warning");
    return;
  }

  const submitBtn = document.getElementById("btn-submit-create-exam");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Đang lưu...</span>`;
  }

  try {
    await window.geoDB.createExam({
      title,
      code,
      durationMinutes: duration,
      mode,
      lockBrowser,
      content
    });

    closeModal("modal-exam-create");
    showToast(`Đã kích hoạt bài kiểm tra "${title}" với mã truy cập "${code}"!`, "success");

    // Điền nhanh mã đề vừa tạo vào ô tìm kiếm đề thi
    quickFillExamCode(code);

    // Cập nhật danh sách chip mã đề thi gợi ý
    renderExamHubQuickChips();

    // Nếu đang mở Admin manager thì làm mới bảng
    if (document.getElementById("modal-exam-admin")?.classList.contains("show")) {
      renderAdminExamsTable();
    }
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Kích Hoạt Bài Kiểm Tra</span>
      `;
    }
  }
}

function openAdminExamManager() {
  const isAuth = window.geoAuth && window.geoAuth.isAuthenticated();
  const isAdmin = window.geoAuth && window.geoAuth.isAdmin();
  const isDev = window.geoAuth && window.geoAuth.isDeveloper();

  if (!isAuth || (!isAdmin && !isDev)) {
    showToast("Chỉ Quản trị viên mới có quyền mở bảng quản lý bài thi!", "error");
    return;
  }

  switchExamAdminTab("exams");
  renderAdminExamsTable();
  renderExamSubmissionsTable();

  openModal("modal-exam-admin");
}

function switchExamAdminTab(tabName) {
  const btnExams = document.getElementById("btn-exam-tab-list");
  const btnSubs = document.getElementById("btn-exam-tab-subs");
  const paneExams = document.getElementById("exam-admin-pane-exams");
  const paneSubs = document.getElementById("exam-admin-pane-submissions");

  if (tabName === "exams") {
    btnExams?.classList.add("active");
    btnSubs?.classList.remove("active");
    if (paneExams) paneExams.style.display = "block";
    if (paneSubs) paneSubs.style.display = "none";
    renderAdminExamsTable();
  } else {
    btnSubs?.classList.add("active");
    btnExams?.classList.remove("active");
    if (paneSubs) paneSubs.style.display = "block";
    if (paneExams) paneExams.style.display = "none";
    renderExamSubmissionsTable();
  }
}

function renderAdminExamsTable() {
  const tbody = document.getElementById("exam-admin-table-body");
  const countEl = document.getElementById("admin-exams-count");
  if (!tbody || !window.geoDB) return;

  const exams = window.geoDB.getAllExams();
  if (countEl) countEl.textContent = exams.length;

  if (exams.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
          Chưa có bài kiểm tra nào được tạo. Hãy nhấn "+ Tạo Đề Thi Mới" để bắt đầu!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = exams.map(exam => {
    const isLocked = Boolean(exam.lockBrowser);
    const modeLabel = exam.mode === "view_only" ? "Chỉ xem" : "Xem & Làm";
    return `
      <tr>
        <td>
          <strong style="color: var(--text-main);">${escapeHtml(exam.title)}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Tạo ngày: ${exam.createdDateStr || '---'}</div>
        </td>
        <td>
          <span style="display: inline-block; padding: 3px 8px; border-radius: 5px; background: rgba(13, 148, 136, 0.12); color: var(--primary); font-weight: 800; letter-spacing: 0.5px;">
            ${escapeHtml(exam.code)}
          </span>
        </td>
        <td>${exam.durationMinutes} phút</td>
        <td><span style="font-size: 0.8rem; font-weight: 600;">${modeLabel}</span></td>
        <td>
          <button type="button" class="btn btn-sm ${isLocked ? 'btn-danger' : 'btn-secondary'}" 
            onclick="toggleExamLockAdmin('${exam.id}', ${!isLocked})" 
            title="Nhấn để ${isLocked ? 'Tắt' : 'Bật'} Khóa Trình Duyệt">
            ${isLocked ? 'Đang Khóa' : 'Đang Mở'}
          </button>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="quickPreviewExamAdmin('${exam.id}')" title="Xem đề bài">Xem</button>
            <button type="button" class="btn btn-sm btn-danger" onclick="deleteExamAdmin('${exam.id}')" title="Xóa bài thi">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function toggleExamLockAdmin(examId, newLockState) {
  try {
    await window.geoDB.toggleExamBrowserLock(examId, newLockState);
    renderAdminExamsTable();
    showToast(`Đã ${newLockState ? 'BẬT' : 'TẮT'} cơ chế Khóa trình duyệt cho bài kiểm tra này!`, "info");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteExamAdmin(examId) {
  if (!confirm("Bạn có chắc chắn muốn xóa bài kiểm tra này không?")) return;
  try {
    await window.geoDB.deleteExam(examId);
    renderAdminExamsTable();
    showToast("Đã xóa bài kiểm tra thành công!", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function quickPreviewExamAdmin(examId) {
  const exam = window.geoDB.getExamById(examId);
  if (!exam) return;
  alert(`=== [MÃ: ${exam.code}] ${exam.title} ===\nThời gian: ${exam.durationMinutes} phút | Khóa trình duyệt: ${exam.lockBrowser ? 'BẬT' : 'TẮT'}\n\nNỘI DUNG ĐỀ THI:\n${exam.content}`);
}

function renderExamSubmissionsTable() {
  const tbody = document.getElementById("exam-submissions-table-body");
  const countEl = document.getElementById("admin-subs-count");
  const summaryEl = document.getElementById("exam-subs-summary-text");
  const filterSelect = document.getElementById("exam-sub-filter-select");
  if (!tbody || !window.geoDB) return;

  const exams = window.geoDB.getAllExams();
  const allSubs = window.geoDB.getExamSubmissions();
  if (countEl) countEl.textContent = allSubs.length;

  // Cập nhật select filter đầy đủ danh sách đề thi hiện có
  if (filterSelect) {
    const currentVal = filterSelect.value || "all";
    filterSelect.innerHTML = `<option value="all">Tất cả bài kiểm tra</option>`;
    exams.forEach(ex => {
      const opt = document.createElement("option");
      opt.value = ex.id;
      opt.textContent = `[${ex.code}] ${ex.title}`;
      if (ex.id === currentVal) opt.selected = true;
      filterSelect.appendChild(opt);
    });
  }

  const selectedExamId = filterSelect ? filterSelect.value : "all";
  const filteredSubs = selectedExamId === "all" ? allSubs : allSubs.filter(s => s.examId === selectedExamId);

  if (summaryEl) {
    summaryEl.textContent = `${filteredSubs.length} bài nộp`;
  }

  if (filteredSubs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
          Chưa có thí sinh nào nộp bài cho bài kiểm tra này.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredSubs.map(sub => {
    const min = Math.floor((sub.timeSpentSeconds || 0) / 60);
    const sec = (sub.timeSpentSeconds || 0) % 60;
    const timeSpentStr = `${min}p ${sec}s`;
    const hasViolations = (sub.violationsCount || 0) > 0;

    return `
      <tr>
        <td>
          <strong style="color: var(--text-main);">${escapeHtml(sub.studentName)}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(sub.studentEmail || 'Không có email')}</div>
        </td>
        <td>
          <strong style="font-size: 0.85rem;">${escapeHtml(sub.examTitle)}</strong>
          <span style="display: block; font-size: 0.72rem; color: var(--text-muted);">Mã: ${escapeHtml(sub.examCode || '---')}</span>
        </td>
        <td style="font-size: 0.82rem;">${sub.submittedAtStr || '---'}</td>
        <td style="font-size: 0.82rem; font-weight: 600;">${timeSpentStr}</td>
        <td>
          ${hasViolations
        ? `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: rgba(239, 68, 68, 0.15); color: #dc2626; font-weight: 700; font-size: 0.78rem;">
                 Thoát tab: ${sub.violationsCount} lần
               </span>`
        : `<span style="color: var(--success); font-weight: 600; font-size: 0.78rem;">Khong vi pham</span>`
      }
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-sm btn-primary" onclick="viewExamSubmissionDetail('${sub.id}')">Xem</button>
            <button type="button" class="btn btn-sm btn-danger" onclick="deleteExamSubmissionAdmin('${sub.id}')" title="Xóa bài nộp">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function deleteExamSubmissionAdmin(subId) {
  if (!confirm("Bạn có chắc chắn muốn xóa bản ghi bài nộp này không?")) return;
  try {
    await window.geoDB.deleteExamSubmission(subId);
    renderExamSubmissionsTable();
    showToast("Đã xóa bài nộp thành công!", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function viewExamSubmissionDetail(subId) {
  const allSubs = window.geoDB.getExamSubmissions();
  const sub = allSubs.find(s => s.id === subId);
  if (!sub) return;

  const card = document.getElementById("exam-submission-detail-card");
  const nameEl = document.getElementById("detail-sub-student-name");
  const metaEl = document.getElementById("detail-sub-meta");
  const violationsBox = document.getElementById("detail-sub-violations-box");
  const answersEl = document.getElementById("detail-sub-answers-content");

  if (!card) return;

  card.style.display = "block";
  if (nameEl) nameEl.textContent = `Bài làm của: ${sub.studentName} (${sub.studentEmail || 'Ẩn danh'})`;
  if (metaEl) {
    const min = Math.floor((sub.timeSpentSeconds || 0) / 60);
    const sec = (sub.timeSpentSeconds || 0) % 60;
    metaEl.textContent = `Bài kiểm tra: ${sub.examTitle} [MÃ: ${sub.examCode}] • Thời gian nộp: ${sub.submittedAtStr || '---'} • Thời lượng: ${min}p ${sec}s`;
  }

  // Nhật ký vi phạm
  if (violationsBox) {
    if ((sub.violationsCount || 0) > 0) {
      violationsBox.style.display = "block";
      const logsHtml = (sub.violationLogs || []).map(log => `
        <li style="margin-bottom: 4px;"><strong>${escapeHtml(log.time)}</strong>: ${escapeHtml(log.reason)}</li>
      `).join("");

      violationsBox.innerHTML = `
        <strong style="color: #b91c1c; font-size: 0.88rem;">[Cảnh báo] Phát hiện ${sub.violationsCount} lần vi phạm thoát màn hình:</strong>
        <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 0.8rem; color: #991b1b;">
          ${logsHtml || `<li>Thoát tab hoặc mất tiêu điểm (${sub.violationsCount} lần)</li>`}
        </ul>
      `;
    } else {
      violationsBox.style.display = "none";
    }
  }

  // Nội dung bài làm
  if (answersEl) {
    answersEl.textContent = sub.answers || "(Thí sinh không nhập nội dung bài làm)";
  }

  // Cuộn xuống xem chi tiết
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeSubmissionDetailCard() {
  const card = document.getElementById("exam-submission-detail-card");
  if (card) card.style.display = "none";
}

// ===== COMPREHENSIVE GLOBAL EXPORTS =====
// All functions called from onclick="" in index.html must be on window
// so they always work regardless of async DOMContentLoaded timing.
window.switchTab = switchTab;
window.toggleMobileNav = toggleMobileNav;
window.closeMobileNav = closeMobileNav;
window.switchAuthGateTab = switchAuthGateTab;
window.submitAuthGateLogin = submitAuthGateLogin;
window.submitAuthGateRegister = submitAuthGateRegister;
window.submitModalRegister = submitModalRegister;
window.handleRobotVerificationChoice = handleRobotVerificationChoice;
window.cancelRobotVerification = cancelRobotVerification;
window.cancelGateRobotVerification = cancelGateRobotVerification;
window.checkAuthGate = checkAuthGate;
window.openAddPostModal = openAddPostModal;
window.openAddDocumentModal = openAddDocumentModal;
window.openEditContactModal = openEditContactModal;
window.openChangePasswordModal = openChangePasswordModal;
window.openAddAdminModal = openAddAdminModal;
window.openCreateExamModal = openCreateExamModal;
window.openCommentsFromPreview = openCommentsFromPreview;
window.submitDocRating = submitDocRating;
window.renderAdminAnalytics = renderAdminAnalytics;
window.renderAdminBlockedEmailsList = renderAdminBlockedEmailsList;
window.renderAdminSecurityLogs = renderAdminSecurityLogs;
window.renderAdminTelemetryLogs = renderAdminTelemetryLogs;
window.closeSubmissionDetailCard = closeSubmissionDetailCard;
window.toggleUserPasswordVisibility = toggleUserPasswordVisibility;
window.copyUserPassword = copyUserPassword;
window.openAdminResetPasswordModal = openAdminResetPasswordModal;
window.generateRandomPasswordForAdminReset = generateRandomPasswordForAdminReset;
window.copyAdminResetPassword = copyAdminResetPassword;
window.handleAdminResetPasswordSubmit = handleAdminResetPasswordSubmit;
window.handleTogglePasswordDelegation = handleTogglePasswordDelegation;
// Dynamically rendered HTML onclick functions
window.toggleDocScrollMode = toggleDocScrollMode;
window.switchAdminTab = switchAdminTab;
window.filterAdminConfessions = filterAdminConfessions;
window.openReplyConfessionModal = openReplyConfessionModal;
window.handleToggleConfessionRead = handleToggleConfessionRead;
window.confirmDeleteConfession = confirmDeleteConfession;
window.confirmDeletePost = confirmDeletePost;
window.confirmDeleteDocument = confirmDeleteDocument;
window.confirmExitExam = confirmExitExam;
window.submitStudentExam = submitStudentExam;
window.checkConfessionRateLimit = checkConfessionRateLimit;
window.submitConfessionForm = submitConfessionForm;
window.startConfessionCooldown = startConfessionCooldown;
window.toggleSaveDocument = toggleSaveDocument;
window.handleSavePost = handleSavePost;
window.handleSaveDocument = handleSaveDocument;
window.openEditPostModal = openEditPostModal;
window.openEditDocumentModal = openEditDocumentModal;

// Document preview, rating, comments & search
window.openDocumentPreview = openDocumentPreview;
window.openDocumentCommentsModal = openDocumentCommentsModal;
window.openRatingModal = openRatingModal;
window.downloadPreviewPdf = downloadPreviewPdf;
window.translatePreviewDocumentWithAi = translatePreviewDocumentWithAi;
window.clearDocSearch = clearDocSearch;
window.setDocSearch = setDocSearch;
window.clearPdfUpload = clearPdfUpload;
window.setCommentRatingStars = setCommentRatingStars;
window.submitDocCommentFromModal = submitDocCommentFromModal;
window.handleDeleteDocComment = handleDeleteDocComment;

// Exam System
window.quickFillExamCode = quickFillExamCode;
window.handleCreateExamSubmit = handleCreateExamSubmit;
window.handleGuestExamSubmit = handleGuestExamSubmit;
window.dismissViolationAlert = dismissViolationAlert;
window.deleteExamAdmin = deleteExamAdmin;
window.deleteExamSubmissionAdmin = deleteExamSubmissionAdmin;
window.quickPreviewExamAdmin = quickPreviewExamAdmin;
window.toggleExamLockAdmin = toggleExamLockAdmin;
window.viewExamSubmissionDetail = viewExamSubmissionDetail;
window.openAdminExamManager = openAdminExamManager;
window.switchExamAdminTab = switchExamAdminTab;

// Admin & Security Management
window.renderAdminDashboard = renderAdminDashboard;
window.handleManualBlockEmail = handleManualBlockEmail;
window.handleDeleteUserAccount = handleDeleteUserAccount;
window.handlePromoteAdmin = handlePromoteAdmin;
window.handleDemoteAdmin = handleDemoteAdmin;
window.handleUnlockUserAccount = handleUnlockUserAccount;
window.handleUnblockEmail = handleUnblockEmail;
window.handleImpersonateUser = handleImpersonateUser;
window.handleExitImpersonation = handleExitImpersonation;
window.handleToggleTelemetry = handleToggleTelemetry;
window.handleClearTelemetryLogs = handleClearTelemetryLogs;
window.handleBackupDatabase = handleBackupDatabase;
window.openCountdownConfigModal = openCountdownConfigModal;
window.submitCountdownConfig = submitCountdownConfig;
window.submitMaintenanceToggle = submitMaintenanceToggle;
window.submitChangeMaintenancePwd = submitChangeMaintenancePwd;
window.openChangeMaintenancePwdModal = openChangeMaintenancePwdModal;
window.openMaintenanceToggleModal = openMaintenanceToggleModal;
window.openAdminMaintenanceLogin = openAdminMaintenanceLogin;
window.openMaintenanceTroubleshootModal = openMaintenanceTroubleshootModal;
window.submitMaintenanceTroubleshoot = submitMaintenanceTroubleshoot;
window.handleToggleMaintenanceDelegation = handleToggleMaintenanceDelegation;

// UI, Themes, Language, Globe & Post Translation
window.toggleTheme = toggleTheme;
window.toggleLanguageDropdown = toggleLanguageDropdown;
window.selectLanguage = selectLanguage;
window.handleGoogleLoginGate = handleGoogleLoginGate;
window.submitModalLogin = submitModalLogin;
window.cancelGateRobotVerification = cancelGateRobotVerification;
window.globeSetMode = globeSetMode;
window.globeSetMapTheme = globeSetMapTheme;
window.openGlobeEditModal = openGlobeEditModal;
window.toggleTranslateSinglePost = toggleTranslateSinglePost;
window.toggleAutoTranslateContent = toggleAutoTranslateContent;
