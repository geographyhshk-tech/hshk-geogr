/**
 * MODULE: DOCUMENTS & KNOWLEDGE REPOSITORY CONTROLLER
 * Geography Edu - High School Help Kit
 * Quan ly kho tai lieu Dia li 10, 11, 12 va Chuyen de, tim kiem thong minh,
 * bookmark tai lieu yeu thich, danh gia 5 sao, binh luan va xem truoc PDF/hinh anh.
 */

const GeoDocsModule = (function () {
  let selectedDocForRating = null;
  let currentSelectedRating = 5;
  let activeDocEditTargetId = null;

  function toggleDocScrollMode(mode) {
    if (window.appState) window.appState.docScrollMode = mode;
    const btnGrid = document.getElementById("btn-doc-view-grid");
    const btnScroll = document.getElementById("btn-doc-view-scroll");
    const container = document.getElementById("docs-grid-container");

    if (btnGrid) btnGrid.classList.toggle("active", mode === "grid");
    if (btnScroll) btnScroll.classList.toggle("active", mode === "scroll");

    if (container) {
      if (mode === "scroll") {
        container.classList.add("scroll-view-mode");
      } else {
        container.classList.remove("scroll-view-mode");
      }
    }
  }

  function setDocSearch(keyword) {
    const searchInput = document.getElementById("doc-search-input");
    if (searchInput) {
      searchInput.value = keyword;
      if (window.appState) {
        window.appState.docSearch = keyword;
        window.appState.docPage = 1;
      }
      if (typeof renderDocumentsView === "function") renderDocumentsView();
    }
  }

  function clearDocSearch() {
    const searchInput = document.getElementById("doc-search-input");
    if (searchInput) {
      searchInput.value = "";
      if (window.appState) {
        window.appState.docSearch = "";
        window.appState.docPage = 1;
      }
      if (typeof renderDocumentsView === "function") renderDocumentsView();
    }
  }

  async function toggleSaveDocument(docId, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const user = window.geoAuth ? window.geoAuth.currentUser : null;
    if (!user) {
      if (typeof showToast === "function") showToast("Vui long dang nhap de luu tai lieu vao kho ca nhan!", "info");
      if (typeof openModal === "function") openModal("modal-login");
      return;
    }

    try {
      const isSaved = await window.geoDB.toggleSaveDocument(user.email, docId);
      if (typeof showToast === "function") {
        if (isSaved) {
          showToast("Da luu tai lieu vao danh sach yeu thich!", "success");
        } else {
          showToast("Da bo luu tai lieu!", "info");
        }
      }

      if (typeof updateSavedBadgeCounter === "function") updateSavedBadgeCounter();
      if (window.appState && window.appState.currentTab === "documents" && typeof renderDocumentsView === "function") {
        renderDocumentsView();
      }
      if (window.appState && window.appState.currentTab === "saved" && typeof renderSavedDocumentsView === "function") {
        renderSavedDocumentsView();
      }
    } catch (err) {
      if (typeof showToast === "function") showToast("Loi khi luu tai lieu: " + err.message, "error");
    }
  }

  function openRatingModal(docId) {
    const user = window.geoAuth ? window.geoAuth.currentUser : null;
    if (!user) {
      if (typeof showToast === "function") showToast("Vui long dang nhap de danh gia sao va viet binh luan!", "info");
      if (typeof openModal === "function") openModal("modal-login");
      return;
    }

    const doc = window.geoDB ? window.geoDB.getDocumentById(docId) : null;
    if (!doc) return;

    selectedDocForRating = doc;
    currentSelectedRating = 5;

    const titleEl = document.getElementById("rating-doc-title");
    const avgEl = document.getElementById("rating-current-avg");
    const commentInput = document.getElementById("rating-comment");

    const docData = window.geoI18n ? window.geoI18n.getDocumentData(doc) : doc;
    if (titleEl) titleEl.textContent = docData.title;
    if (avgEl) avgEl.textContent = (doc.avgRating || 5.0).toFixed(1) + " / 5.0";
    if (commentInput) commentInput.value = "";

    updateStarInputDisplay(5);
    if (typeof openModal === "function") openModal("modal-rating");
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
    const labelEl = document.getElementById("rating-value-label");
    if (labelEl) labelEl.textContent = `${ratingVal} sao`;
  }

  function setCommentRatingStars(val) {
    updateStarInputDisplay(val);
  }

  async function submitDocRating() {
    const user = window.geoAuth ? window.geoAuth.currentUser : null;
    if (!user) {
      if (typeof showToast === "function") showToast("Vui long dang nhap de danh gia tai lieu!", "info");
      if (typeof openModal === "function") openModal("modal-login");
      return;
    }

    if (!selectedDocForRating) return;

    const commentInput = document.getElementById("rating-comment");
    const commentText = commentInput ? commentInput.value.trim() : "";

    try {
      const docId = selectedDocForRating.id;
      await window.geoDB.addDocumentRating(docId, currentSelectedRating, commentText, user);

      if (typeof closeModal === "function") closeModal("modal-rating");
      if (typeof showToast === "function") {
        showToast(`Cam on ${user.name} da danh gia ${currentSelectedRating} sao cho tai lieu!`, "success");
      }

      if (window.appState && window.appState.currentTab === "documents" && typeof renderDocumentsView === "function") {
        renderDocumentsView();
      }
      if (window.appState && window.appState.currentTab === "saved" && typeof renderSavedDocumentsView === "function") {
        renderSavedDocumentsView();
      }
    } catch (err) {
      if (typeof showToast === "function") showToast("Loi khi danh gia: " + err.message, "error");
    }
  }

  return {
    toggleDocScrollMode,
    setDocSearch,
    clearDocSearch,
    toggleSaveDocument,
    openRatingModal,
    updateStarInputDisplay,
    setCommentRatingStars,
    submitDocRating
  };
})();

window.GeoDocsModule = GeoDocsModule;
