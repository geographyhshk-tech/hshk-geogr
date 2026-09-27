/**
 * MODULE: CONFESSIONS & FEEDBACK CONTROLLER
 * Geography Edu - High School Help Kit
 * Dieu khien Hom thu Confession / Hoi dap den Admin, gioi han 5 bai/gio,
 * dem nguoc 5 giay giua cac lan gui va quan tri tra loi / xoa confession.
 */

const GeoConfessionsModule = (function () {
  let _confessionCooldownSeconds = 0;
  let _confessionCooldownTimer = null;
  let _origSubmitFeedbackBtnHtml = "";
  let _isSubmittingConfession = false;

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

    if (_isSubmittingConfession) {
      console.warn("[ConfessionModule] Request dang duoc xu ly, bo qua submit trung.");
      return;
    }

    const submitBtn = document.getElementById("btn-submit-feedback");
    const formContactFeedback = document.getElementById("form-contact-feedback");

    if (_confessionCooldownSeconds > 0) {
      if (typeof showToast === "function") {
        showToast(`Vui long doi ${_confessionCooldownSeconds} giay nua de tiep tuc gui confession!`, "warning");
      }
      return;
    }

    const honeypotVal = document.getElementById("feedback-hp-check")?.value;
    if (honeypotVal) {
      console.warn("[Security] Bot detected via Honeypot. Request cancelled.");
      if (formContactFeedback) formContactFeedback.reset();
      if (typeof showToast === "function") showToast("Cau hoi cua ban da duoc tiep nhan!", "success");
      return;
    }

    const textarea = document.getElementById("feedback-message");
    const message = textarea ? textarea.value.trim() : "";
    if (!message) {
      if (typeof showToast === "function") showToast("Vui long nhap noi dung cau hoi hoac confession!", "error");
      if (textarea) textarea.focus();
      return;
    }
    if (message.length < 10) {
      if (typeof showToast === "function") showToast("Noi dung confession phai co it nhat 10 ky tu!", "error");
      if (textarea) textarea.focus();
      return;
    }

    let rateLimit;
    try {
      rateLimit = checkConfessionRateLimit();
    } catch (err) {
      if (typeof showToast === "function") showToast(err.message, "error");
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

      if (typeof showToast === "function") {
        showToast("Cau hoi cua ban da duoc gui thanh cong den Admin!", "success");
      }
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

      startConfessionCooldown(5);

    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (_origSubmitFeedbackBtnHtml) submitBtn.innerHTML = _origSubmitFeedbackBtnHtml;
      }
      if (typeof showToast === "function") showToast("Loi khi gui: " + err.message, "error");
    } finally {
      _isSubmittingConfession = false;
    }
  }

  function renderContactView() {
    const isAdmin = window.geoAuth && window.geoAuth.isAdmin ? window.geoAuth.isAdmin() : false;
    const info = window.geoDB ? window.geoDB.getContactInfo() : {};

    const adminEditBtn = document.getElementById("admin-edit-contact-btn");
    if (adminEditBtn) {
      adminEditBtn.style.display = isAdmin ? "inline-flex" : "none";
    }

    const elProjectName = document.getElementById("contact-display-project");
    if (elProjectName) elProjectName.textContent = info.project_name || "";

    const elSlogan = document.getElementById("contact-display-slogan");
    if (elSlogan) elSlogan.textContent = info.slogan || "";

    const elEmail = document.getElementById("contact-display-email");
    if (elEmail) elEmail.textContent = info.email || "";

    const elHotline = document.getElementById("contact-display-hotline");
    if (elHotline) elHotline.textContent = info.hotline || "";

    const elFanpage = document.getElementById("contact-display-fanpage");
    if (elFanpage) {
      elFanpage.textContent = info.fanpage_name || "";
      elFanpage.setAttribute("href", info.fanpage_url || "#");
    }

    const elGroup = document.getElementById("contact-display-group");
    if (elGroup) {
      elGroup.textContent = info.group_name || "";
      elGroup.setAttribute("href", info.group_url || "#");
    }

    const elAddress = document.getElementById("contact-display-address");
    if (elAddress) elAddress.textContent = info.address || "";

    const elHours = document.getElementById("contact-display-hours");
    if (elHours) elHours.textContent = info.work_hours || "";

    renderPublicConfessions();
  }

  function renderPublicConfessions() {
    const container = document.getElementById("public-confessions-grid");
    if (!container || !window.geoDB) return;

    const confessions = window.geoDB.getConfessions();
    const publicCfs = confessions.filter(c => c.reply);

    const toolbar = document.getElementById("public-cfs-toolbar");
    const countText = document.getElementById("public-cfs-count-text");
    if (countText) {
      countText.textContent = `Cau hoi da giai dap (${publicCfs.length})`;
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
          <h3>Chua co cau hoi nao duoc giai dap</h3>
        </div>
      `;
      return;
    }

    container.innerHTML = publicCfs.map((cfs, idx) => {
      const sttDisplay = publicCfs.length - idx;
      const escape = typeof escapeHtml === "function" ? escapeHtml : (str => str || "");

      const replyHtml = `
        <div class="confession-reply-box">
          <div class="confession-reply-header">
            <div class="confession-reply-admin">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"></path></svg>
              <span>Admin tra loi: ${escape(cfs.replyBy || 'Admin')}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${cfs.replyDate || ''}</span>
          </div>
          <div class="confession-reply-text">${escape(cfs.reply)}</div>
        </div>
      `;

      return `
        <div class="confession-card">
          <div>
            <div class="confession-header" style="margin-bottom: 10px;">
              <span style="font-weight: 700; color: var(--text-muted); font-size: 0.82rem;">#${sttDisplay}</span>
              <span style="font-size: 0.78rem; color: var(--text-muted);"> ${cfs.createdAt || ''}</span>
            </div>
            <p class="confession-body" style="margin: 0;">${escape(cfs.message)}</p>
          </div>
          ${replyHtml}
        </div>
      `;
    }).join("");
  }

  return {
    checkConfessionRateLimit,
    startConfessionCooldown,
    submitConfessionForm,
    renderContactView,
    renderPublicConfessions
  };
})();

window.GeoConfessionsModule = GeoConfessionsModule;
