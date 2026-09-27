/**
 * MODULE: ADMIN MANAGEMENT & SECURITY CONTROLLER
 * Geography Edu - High School Help Kit
 * Quan tri vien he thong, phan quyen mat khau, danh sach den (Blacklist),
 * xem/copy/dat lai mat khau thanh vien, mo khoa va che do bao tri / lap trinh vien.
 */

const GeoAdminModule = (function () {
  function switchAdminTab(subTabName) {
    if (!subTabName) subTabName = "overview";
    if (window.appState) window.appState.adminSubTab = subTabName;

    const buttons = document.querySelectorAll(".admin-sub-nav-btn");
    buttons.forEach(btn => {
      if (btn.getAttribute("data-admin-tab") === subTabName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

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

  async function handleUnlockUserAccount(userId, userEmail) {
    try {
      if (!window.geoAuth) return;
      await window.geoAuth.unlockUserAccount(userId, userEmail);
      if (typeof showToast === "function") {
        showToast(`Da mo khoa tai khoan ${userEmail} thanh cong! So lan thu mat khau da duoc dat lai.`, "success");
      }
      if (typeof renderAdminDashboard === "function") renderAdminDashboard();
    } catch (err) {
      if (typeof showToast === "function") showToast(err.message, "error");
    }
  }

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
              <span>Hien chua co dia chi Gmail nao trong danh sach den (Blacklist).</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const escape = typeof escapeHtml === "function" ? escapeHtml : (s => s || "");
    tableBody.innerHTML = blockedList.map((item, idx) => {
      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 800; font-size: 0.72rem;">BLOCKED</span>
              <code style="font-weight: 700; color: #ef4444;">${escape(item.email)}</code>
            </div>
          </td>
          <td style="color: var(--text-main);">${escape(item.reason || 'Vi pham quy dinh')}</td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${escape(item.blockedAt || '2026')}</td>
          <td><span class="badge badge-secondary" style="font-size: 0.76rem;">${escape(item.blockedBy || 'Quan tri vien')}</span></td>
          <td style="text-align: center;">
            <button class="btn btn-sm btn-outline-success" style="padding: 4px 10px; font-size: 0.78rem; font-weight: 700;" title="Bo chan email nay" onclick="handleUnblockEmail('${item.id}', '${escape(item.email)}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Bo Chan</span>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function handleUnblockEmail(blockedId, email) {
    if (!confirm(`Xac nhan go bo Gmail ${email} khoi danh sach den (Blacklist)?`)) {
      return;
    }

    try {
      if (!window.geoDB) return;
      await window.geoDB.unblockEmail(blockedId, window.geoAuth ? window.geoAuth.getCurrentUser() : null);
      if (typeof showToast === "function") showToast(`Da go bo ${email} khoi Blacklist thanh cong!`, "success");
      renderAdminBlockedEmailsList();
    } catch (err) {
      if (typeof showToast === "function") showToast(err.message, "error");
    }
  }

  async function handleTogglePasswordDelegation(adminId, adminEmail, delegate = true) {
    const isSuper = window.geoAuth && window.geoAuth.isSuperAdmin ? window.geoAuth.isSuperAdmin() : false;
    if (!isSuper) {
      if (typeof showToast === "function") {
        showToast("Chi Super Admin (Chu so huu he thong) moi co quyen uy quyen xem mat khau!", "error");
      }
      return;
    }

    const actionText = delegate ? "UY QUYEN XEM MAT KHAU" : "THU HOI QUYEN XEM MAT KHAU";
    if (!confirm(`Xac nhan ${actionText} cho tai khoan Admin: ${adminEmail}?`)) {
      return;
    }

    try {
      await window.geoAuth.togglePasswordDelegation(adminId, delegate);
      if (typeof showToast === "function") {
        showToast(`Da ${delegate ? 'uy quyen' : 'thu hoi quyen'} xem mat khau cho Admin ${adminEmail} thanh cong!`, "success");
      }
      if (typeof renderAdminDashboard === "function") renderAdminDashboard();
    } catch (err) {
      if (typeof showToast === "function") showToast(err.message, "error");
    }
  }

  function toggleUserPasswordVisibility(userId) {
    const span = document.getElementById(`pwd-text-${userId}`);
    const btn = document.getElementById(`btn-toggle-pwd-${userId}`);
    if (!span || !btn) return;

    const full = span.getAttribute("data-full");
    const masked = span.getAttribute("data-masked");
    const isShowing = span.classList.contains("revealed");

    if (isShowing) {
      span.textContent = masked;
      span.classList.remove("revealed");
      btn.title = "Hien mat khau";
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    } else {
      span.textContent = full;
      span.classList.add("revealed");
      btn.title = "An mat khau";
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    }
  }

  function copyUserPassword(userId) {
    const span = document.getElementById(`pwd-text-${userId}`);
    if (!span) return;
    const full = span.getAttribute("data-full") || span.textContent;
    if (!full) return;

    navigator.clipboard.writeText(full).then(() => {
      if (typeof showToast === "function") showToast("Da sao chep mat khau vao bo nho tam!", "success");
    }).catch(() => {
      if (typeof showToast === "function") showToast("Khong the sao chep mat khau.", "error");
    });
  }

  return {
    switchAdminTab,
    handleUnlockUserAccount,
    renderAdminBlockedEmailsList,
    handleUnblockEmail,
    handleTogglePasswordDelegation,
    toggleUserPasswordVisibility,
    copyUserPassword
  };
})();

window.GeoAdminModule = GeoAdminModule;
