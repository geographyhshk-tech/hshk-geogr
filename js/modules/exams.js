/**
 * MODULE: ONLINE EXAM & SURVEY CONTROLLER
 * Geography Edu - High School Help Kit
 * Phong thi va Khao sat truc tuyen, co che Kiosk Mode chong gian lan (Anti-Cheat),
 * cham diem tu dong va quan tri de thi, ket qua thi sinh.
 */

const GeoExamsModule = (function () {
  function fillExamCode(code) {
    const input = document.getElementById("input-exam-code");
    if (input) {
      input.value = code;
      input.focus();
      if (typeof showToast === "function") {
        showToast(`Da tu dong dien ma de: ${code}`, "info");
      }
    }
  }

  function renderExamHubQuickChips() {
    const container = document.getElementById("exam-quick-chips-container") || document.querySelector(".exam-hub-quick-chips");
    if (container) {
      container.innerHTML = "";
      container.style.display = "none";
    }
  }

  function openCreateExamModal() {
    if (typeof openModal === "function") {
      openModal("modal-create-exam");
    }
  }

  function openExamAdminModal() {
    if (typeof openModal === "function") {
      openModal("modal-exam-admin");
    }
    if (typeof renderAdminExamsTable === "function") renderAdminExamsTable();
    if (typeof renderExamSubmissionsTable === "function") renderExamSubmissionsTable();
  }

  function confirmExitExam() {
    if (confirm("Ban co chac chan muon thoat khoi phong thi khong? Ket qua lam bai chua nop se bi huy bo.")) {
      if (typeof exitKioskExamMode === "function") {
        exitKioskExamMode();
      }
    }
  }

  return {
    fillExamCode,
    renderExamHubQuickChips,
    openCreateExamModal,
    openExamAdminModal,
    confirmExitExam
  };
})();

window.GeoExamsModule = GeoExamsModule;
