/**
 * MODULE: POSTS & COMMUNITY CONTROLLER
 * Geography Edu - High School Help Kit
 * Quan ly bai viet tin tuc High School Help Kit, bai chia se Group Dia Li,
 * them/sua/xoa bai viet va tinh nang dich bai viet da ngon ngu.
 */

const GeoPostsModule = (function () {
  let activePostEditTarget = null; // { type: 'hshk' | 'group', id: string | null }

  function getActivePostEditTarget() {
    return activePostEditTarget;
  }

  function setActivePostEditTarget(target) {
    activePostEditTarget = target;
  }

  function openAddPostModal(type) {
    activePostEditTarget = { type, id: null };
    const modalTitle = document.getElementById("modal-post-crud-title");
    const tagInput = document.getElementById("post-form-tag");
    const titleInput = document.getElementById("post-form-title");
    const authorInput = document.getElementById("post-form-author");
    const contentInput = document.getElementById("post-form-content");

    if (modalTitle) {
      modalTitle.textContent = type === "hshk"
        ? "Them Bai Viet High School Help Kit"
        : "Them Bai Viet Group Dia Li";
    }

    if (tagInput) tagInput.value = type === "hshk" ? "Du an" : "Chia se";
    if (titleInput) titleInput.value = "";
    if (authorInput) {
      const user = window.geoAuth ? window.geoAuth.currentUser : null;
      authorInput.value = user ? user.name : (type === "hshk" ? "HSHK Team" : "Admin Group");
    }
    if (contentInput) contentInput.value = "";

    if (typeof openModal === "function") openModal("modal-post-crud");
  }

  function openEditPostModal(type, postId) {
    activePostEditTarget = { type, id: postId };
    const post = type === "hshk"
      ? (window.geoDB ? window.geoDB.getHshkPostById(postId) : null)
      : (window.geoDB ? window.geoDB.getGroupPostById(postId) : null);

    if (!post) {
      if (typeof showToast === "function") showToast("Khong tim thay thong tin bai viet can sua!", "error");
      return;
    }

    const modalTitle = document.getElementById("modal-post-crud-title");
    const tagInput = document.getElementById("post-form-tag");
    const titleInput = document.getElementById("post-form-title");
    const authorInput = document.getElementById("post-form-author");
    const contentInput = document.getElementById("post-form-content");

    if (modalTitle) {
      modalTitle.textContent = type === "hshk"
        ? "Chinh Sua Bai Viet High School Help Kit"
        : "Chinh Sua Bai Viet Group Dia Li";
    }

    if (tagInput) tagInput.value = post.tag || "";
    if (titleInput) titleInput.value = post.title || "";
    if (authorInput) authorInput.value = post.author || "";
    if (contentInput) contentInput.value = post.content || "";

    if (typeof openModal === "function") openModal("modal-post-crud");
  }

  async function handleSavePost(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!activePostEditTarget) return;

    const { type, id } = activePostEditTarget;
    const tagInput = document.getElementById("post-form-tag");
    const titleInput = document.getElementById("post-form-title");
    const authorInput = document.getElementById("post-form-author");
    const contentInput = document.getElementById("post-form-content");

    const tag = tagInput ? tagInput.value.trim() : "";
    const title = titleInput ? titleInput.value.trim() : "";
    const author = authorInput ? authorInput.value.trim() : "";
    const content = contentInput ? contentInput.value.trim() : "";

    if (!title || !content) {
      if (typeof showToast === "function") showToast("Vui long nhap tieu de va noi dung bai viet!", "error");
      return;
    }

    const postData = {
      id: id || undefined,
      tag: tag || (type === "hshk" ? "Du an" : "Cong dong"),
      title,
      author: author || "Ban quan tri",
      content
    };

    try {
      if (type === "hshk") {
        await window.geoDB.saveHshkPost(postData);
      } else {
        await window.geoDB.saveGroupPost(postData);
      }

      if (typeof closeModal === "function") closeModal("modal-post-crud");
      if (typeof renderHomeView === "function") renderHomeView();
      if (typeof renderAdminDashboard === "function") renderAdminDashboard();
      if (typeof showToast === "function") {
        showToast(id ? "Da cap nhat bai viet thanh cong!" : "Da dang bai viet moi thanh cong!", "success");
      }
    } catch (err) {
      if (typeof showToast === "function") showToast("Loi khi luu bai viet: " + err.message, "error");
    }
  }

  async function confirmDeletePost(type, postId) {
    const post = type === "hshk"
      ? (window.geoDB ? window.geoDB.getHshkPostById(postId) : null)
      : (window.geoDB ? window.geoDB.getGroupPostById(postId) : null);

    const postTitle = post ? `"${post.title}"` : "bai viet nay";
    if (!confirm(`Ban co chac chan muon xoa ${postTitle} khong? Hanh dong nay se go bo vinh vien.`)) {
      return;
    }

    try {
      if (type === "hshk") {
        await window.geoDB.deleteHshkPost(postId);
      } else {
        await window.geoDB.deleteGroupPost(postId);
      }
      if (typeof renderHomeView === "function") renderHomeView();
      if (typeof renderAdminDashboard === "function") renderAdminDashboard();
      if (typeof showToast === "function") showToast("Da xoa bai viet thanh cong!", "success");
    } catch (err) {
      if (typeof showToast === "function") showToast("Loi khi xoa bai viet: " + err.message, "error");
    }
  }

  return {
    getActivePostEditTarget,
    setActivePostEditTarget,
    openAddPostModal,
    openEditPostModal,
    handleSavePost,
    confirmDeletePost
  };
})();

window.GeoPostsModule = GeoPostsModule;
