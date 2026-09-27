/**
 * AI CHAT ASSISTANT - Geography Edu
 * Powered by Google Gemini AI
 * Nha phat trien: Tran Huy Vu
 */

// Dynamic Runtime Key Decryption & Secure Provider removed.

const AI_CONFIG = {
  API_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  MODEL: "gemini-1.5-flash",
  SYSTEM_PROMPT: `Ban la tro ly AI chuyen sau cua du an "Geography Edu - High School Help Kit", mot nen tang giao duc Dia li danh cho hoc sinh THCS va THPT Viet Nam. Nhiem vu cua ban: Giai dap cau hoi ve kien thuc Dia li (tu nhien, kinh te - xa hoi, Dia li Viet Nam, Dia li dai cuong), Ho tro on luyen kien thuc Dia li theo chuong trinh THCS/THPT, Giup hoc sinh hieu ban do, Atlat, so lieu thong ke, Tu van phuong phap hoc tap va on thi Dia li hieu qua. Phong cach: Chuyen nghiep, chuan muc, de hieu, tieng Viet chuan muc, khong su dung emoji. Luon nho: Ban la "Tro Ly Dia Li AI" cua Geography Edu!`,
  MAX_HISTORY: 10,
  MAX_INPUT_LENGTH: 2000,
  STORAGE_KEY: "geo_edu_ai_chats"
};

// ===== STATE =====
const aiChatState = {
 sessions: [],
 activeSid: null,
 isTyping: false
};

// ===== LOCALSTORAGE (ENCRYPTED) =====
function aiSaveSessions() {
 try {
  const vault = window.GeoCryptoVault;
  const payload = vault ? vault.encrypt(aiChatState.sessions) : JSON.stringify(aiChatState.sessions);
  localStorage.setItem(AI_CONFIG.STORAGE_KEY, payload);
 } catch (e) { }
}

function aiLoadSessions() {
 try {
  const raw = localStorage.getItem(AI_CONFIG.STORAGE_KEY);
  if (raw) {
   const vault = window.GeoCryptoVault;
   const parsed = vault ? vault.decrypt(raw) : JSON.parse(raw);
   aiChatState.sessions = Array.isArray(parsed) ? parsed : [];
  } else {
   aiChatState.sessions = [];
  }
 } catch (e) { aiChatState.sessions = []; }
}

// ===== SESSION HELPERS =====
function aiNewSession() {
 const sid = "chat_" + Date.now();
 aiChatState.sessions.unshift({ id: sid, title: "Cuoc tro chuyen moi", createdAt: new Date().toLocaleString("vi-VN"), messages: [] });
 aiChatState.activeSid = sid;
 aiSaveSessions();
 renderAiSidebar();
 renderAiWelcome();
 const input = document.getElementById("ai-chat-input");
 if (input) { input.value = ""; input.style.height = "auto"; input.focus(); }
 const sidebar = document.getElementById("ai-sidebar");
 if (sidebar && window.innerWidth < 900) sidebar.classList.remove("open");
}

function aiGetActive() {
 return aiChatState.sessions.find(s => s.id === aiChatState.activeSid) || null;
}

function aiDeleteSession(sid, e) {
 e && e.stopPropagation();
 if (!confirm("Ban co muon xoa cuoc tro chuyen nay?")) return;
 aiChatState.sessions = aiChatState.sessions.filter(s => s.id !== sid);
 if (aiChatState.activeSid === sid) {
  aiChatState.activeSid = aiChatState.sessions[0]?.id || null;
 }
 aiSaveSessions();
 renderAiSidebar();
 if (aiChatState.activeSid) renderAiMessages();
 else renderAiWelcome();
}

function aiSelectSession(sid) {
 aiChatState.activeSid = sid;
 renderAiSidebar();
 renderAiMessages();
 const sidebar = document.getElementById("ai-sidebar");
 if (sidebar && window.innerWidth < 900) sidebar.classList.remove("open");
}

// ===== LIGHT MARKDOWN =====
function aiMarkdown(text) {
 if (!text) return "";
 let t = text
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/__(.+?)__/g, "<strong>$1</strong>")
  .replace(/\*(.+?)\*/g, "<em>$1</em>")
  .replace(/`([^`]+)`/g, '<code style="background:rgba(13,148,136,0.15);color:#0d9488;padding:2px 6px;border-radius:4px;font-size:0.88em;font-family:monospace;">$1</code>')
  .replace(/^### (.+)$/gm, '<h4 style="margin:10px 0 4px;color:#0d9488;font-size:0.97rem;font-weight:700;">$1</h4>')
  .replace(/^## (.+)$/gm, '<h3 style="margin:12px 0 6px;color:#0d9488;font-size:1.05rem;font-weight:700;">$1</h3>')
  .replace(/^# (.+)$/gm, '<h2 style="margin:14px 0 8px;color:#0d9488;">$1</h2>')
  .replace(/^[\-\*] (.+)$/gm, '<li style="margin:3px 0;">$1</li>')
  .replace(/((<li[^>]*>.*?<\/li>\n?)+)/g, '<ul style="padding-left:18px;margin:6px 0;">$1</ul>')
  .replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0;">$1</li>')
  .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(148,163,184,0.3);margin:12px 0;">')
  .replace(/\n\n/g, '</p><p style="margin:6px 0;">')
  .replace(/\n/g, '<br>');
 return `<p style="margin:0;line-height:1.72;">${t}</p>`;
}

// ===== RENDER SIDEBAR =====
function renderAiSidebar() {
 const list = document.getElementById("ai-sessions-list");
 if (!list) return;

 if (aiChatState.sessions.length === 0) {
  list.innerHTML = `
   <div style="padding:28px 14px;text-align:center;color:var(--text-muted);font-size:0.83rem;">
    <div style="font-size:2.2rem;margin-bottom:10px;"></div>
    <div>Chua co cuoc tro chuyen nao<br>Nhan <strong>+ Moi</strong> de bat dau</div>
   </div>`;
  return;
 }

 list.innerHTML = aiChatState.sessions.map(session => {
  const isActive = session.id === aiChatState.activeSid;
  const lastMsg = session.messages[session.messages.length - 1];
  const preview = lastMsg
   ? lastMsg.content.substring(0, 52).replace(/[*#`_]/g, "") + (lastMsg.content.length > 52 ? "\u2026" : "")
   : "Cuoc tro chuyen moi";

  return `
   <div class="ai-session-item${isActive ? ' active' : ''}" onclick="aiSelectSession('${session.id}')">
    <div class="ai-session-icon">
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
    <div class="ai-session-info">
     <div class="ai-session-title">${session.title}</div>
     <div class="ai-session-preview">${preview}</div>
    </div>
    <button class="ai-session-delete" onclick="aiDeleteSession('${session.id}',event)" title="Xoa">
     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    </button>
   </div>`;
 }).join("");
}

// ===== RENDER WELCOME =====
function renderAiWelcome() {
 const msgs = document.getElementById("ai-messages-container");
 if (!msgs) return;
 const _t = (k, fb) => (typeof window.t === "function" ? window.t(k, fb) : fb);

 const isAiDisabled = window.geoDB ? window.geoDB.isAiDisabled() : false;
 const isMaint = window.geoDB ? window.geoDB.isMaintenanceActive() : false;
 const isDev = window.geoAuth ? (window.geoAuth.isDeveloper && window.geoAuth.isDeveloper()) : false;
 const isAdmin = window.geoAuth ? window.geoAuth.isAdmin() : false;

 const input = document.getElementById("ai-chat-input");
 const sendBtn = document.getElementById("ai-send-btn");

 if ((isMaint || isAiDisabled) && !isDev && !isAdmin) {
  const badgeTxt = (window.t ? window.t("aiMaintBadge", "THONG BAO HE THONG") : "THONG BAO HE THONG");
  const titleTxt = (window.t ? window.t("aiMaintTitle", "Hien AI Dang Bao Tri") : "Hien AI Dang Bao Tri");
  const descTxt = (window.t ? window.t("aiMaintDesc", "He thong Tro ly Dia li AI dang duoc nang cap mo hinh va toi uu hoa co so du lieu kien thuc. Tinh nang tro chuyen tam khoa va se som mo lai!") : "He thong Tro ly Dia li AI dang duoc nang cap mo hinh va toi uu hoa co so du lieu kien thuc. Tinh nang tro chuyen tam khoa va se som mo lai!");
  const backHomeTxt = (window.t ? window.t("btnBackHome", "Quay ve Trang chu") : "Quay ve Trang chu");

  msgs.innerHTML = `
   <div class="ai-welcome-screen ai-maintenance-screen" style="max-width: 620px; padding: 40px 20px; text-align: center;">
    <div class="ai-welcome-avatar" style="background: rgba(245, 158, 11, 0.15); color: #d97706; width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
     <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
     </svg>
    </div>
    <div class="badge" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 700; padding: 5px 14px; border-radius: 20px; font-size: 0.82rem; margin-bottom: 12px; display: inline-block;">
     ${escapeHtml(badgeTxt)}
    </div>
    <h2 class="ai-welcome-title" style="color: #b45309; font-size: 1.55rem; font-weight: 800; margin-bottom: 12px;">
     ${escapeHtml(titleTxt)}
    </h2>
    <p class="ai-welcome-subtitle" style="max-width: 500px; margin: 0 auto 24px; font-size: 0.93rem; line-height: 1.65; color: var(--text-muted);">
     ${escapeHtml(descTxt)}
    </p>
    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; align-items: center;">
     <button class="btn btn-primary" onclick="switchTab('home')" style="font-weight: 600; padding: 10px 24px; border-radius: 10px;">
      ${escapeHtml(backHomeTxt)}
     </button>
    </div>
   </div>
  `;
  if (input) { input.disabled = true; input.placeholder = "Tro ly AI dang tam khoa trong thoi gian bao tri..."; }
  if (sendBtn) sendBtn.disabled = true;
  return;
 }

 if (input) { input.disabled = false; input.placeholder = "Nhập câu hỏi môn Địa lí, hỏi về Atlat, thi cử..."; }
 if (sendBtn) sendBtn.disabled = false;

 msgs.innerHTML = `
  <div class="ai-welcome-screen">
   <div class="ai-welcome-avatar">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
     <circle cx="12" cy="12" r="10"></circle>
     <path d="M8 9h8M8 12h6M8 15h4"></path>
    </svg>
   </div>
   <h2 class="ai-welcome-title">${_t("aiWelcomeTitle", "Trợ Lý Địa Lí AI 4.0")}</h2>
   <p class="ai-welcome-subtitle">${_t("aiWelcomeSubtitle", "Nền tảng trí tuệ nhân tạo giáo dục chuyên sâu về Địa lý • Giải đáp Atlat, phương pháp học và kiến thức ôn thi THCS - THPT.")}</p>
   <div class="ai-quick-prompts-grid">
    <button class="ai-quick-btn" onclick="aiSendQuick('Hãy giải thích chi tiết cấu trúc các tầng của lớp vỏ Trái Đất?')">
     <div class="ai-quick-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
     </div>
     <div class="ai-quick-text">
      <span class="ai-quick-tag">Địa lí đại cương</span>
      <span class="ai-quick-label">Cấu trúc lớp vỏ Trái Đất</span>
     </div>
    </button>
    <button class="ai-quick-btn" onclick="aiSendQuick('Phân biệt khí hậu nhiệt đới ẩm gió mùa với khí hậu cận xích đạo ở Việt Nam?')">
     <div class="ai-quick-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
     </div>
     <div class="ai-quick-text">
      <span class="ai-quick-tag">Khí hậu học</span>
      <span class="ai-quick-label">Khí hậu nhiệt đới ẩm gió mùa</span>
     </div>
    </button>
    <button class="ai-quick-btn" onclick="aiSendQuick('Đồng bằng sông Cửu Long có những thế mạnh và hạn chế gì về tự nhiên?')">
     <div class="ai-quick-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
     </div>
     <div class="ai-quick-text">
      <span class="ai-quick-tag">Địa lí kinh tế - xã hội</span>
      <span class="ai-quick-label">Tự nhiên Đồng bằng sông Cửu Long</span>
     </div>
    </button>
    <button class="ai-quick-btn" onclick="aiSendQuick('Hướng dẫn cách đọc và khai thác hiệu quả Atlat Địa lí Việt Nam khi làm bài thi?')">
     <div class="ai-quick-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
     </div>
     <div class="ai-quick-text">
      <span class="ai-quick-tag">Kỹ năng Atlat</span>
      <span class="ai-quick-label">Bí quyết khai thác Atlat điểm cao</span>
     </div>
    </button>
    <button class="ai-quick-btn" onclick="aiSendQuick('Phân tích nguyên nhân và giải pháp ứng phó biến đổi khí hậu ở nước ta?')">
     <div class="ai-quick-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v2M12 20v2m-7.07-14.93 1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
     </div>
     <div class="ai-quick-text">
      <span class="ai-quick-tag">Môi trường</span>
      <span class="ai-quick-label">Biến đổi khí hậu & Giải pháp</span>
     </div>
    </button>
    <button class="ai-quick-btn" onclick="aiSendQuick('Đặc điểm địa hình nhiều đồi núi ảnh hưởng thế nào đến tự nhiên và kinh tế?')">
     <div class="ai-quick-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
     </div>
     <div class="ai-quick-text">
      <span class="ai-quick-tag">Địa lí tự nhiên VN</span>
      <span class="ai-quick-label">Địa hình đồi núi Việt Nam</span>
     </div>
    </button>
   </div>
  </div>`;
}

// ===== RENDER MESSAGES =====
function renderAiMessages() {
 const session = aiGetActive();
 const msgs = document.getElementById("ai-messages-container");
 if (!msgs) return;

 if (!session || session.messages.length === 0) { renderAiWelcome(); return; }

 msgs.innerHTML = session.messages.map(msg => {
  const isUser = msg.role === "user";
  return `
   <div class="ai-msg-row ${isUser ? 'user' : 'assistant'}">
    ${!isUser ? `<div class="ai-msg-avatar ai-bot-avatar"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h.01M12 12h.01M16 12h.01"></path></svg></div>` : ""}
    <div class="ai-msg-bubble ${isUser ? 'ai-user-bubble' : 'ai-bot-bubble'}">
     ${isUser
    ? `<div style="white-space:pre-wrap;line-height:1.65;">${msg.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
    : aiMarkdown(msg.content)
   }
     <div class="ai-msg-time">${msg.time || ""}</div>
    </div>
    ${isUser ? `<div class="ai-msg-avatar ai-user-avatar"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>` : ""}
   </div>`;
 }).join("");

 setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
}

// ===== TYPING =====
function showAiTyping() {
 const msgs = document.getElementById("ai-messages-container");
 if (!msgs) return;
 const el = document.createElement("div");
 el.id = "ai-typing-indicator";
 el.className = "ai-msg-row assistant";
 el.innerHTML = `
  <div class="ai-msg-avatar ai-bot-avatar"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h.01M12 12h.01M16 12h.01"></path></svg></div>
  <div class="ai-msg-bubble ai-bot-bubble" style="padding:14px 18px;">
   <div class="ai-typing-dots"><span></span><span></span><span></span></div>
  </div>`;
 msgs.appendChild(el);
 msgs.scrollTop = msgs.scrollHeight;
}

function hideAiTyping() {
 const el = document.getElementById("ai-typing-indicator");
 if (el) el.remove();
}

// Rate limiting for AI Chat (1 question every 3 seconds per user)
let lastAiChatTimestamp = 0;

// ===== SEND =====
async function aiSendMessage() {
 const isMaint = window.geoDB ? window.geoDB.isMaintenanceActive() : false;
 const isAdmin = window.geoAuth ? window.geoAuth.isAdmin() : false;
 if (isMaint && !isAdmin) {
  showToast("Trợ lý AI đang tạm khóa do hệ thống đang trong Chế độ Bảo trì. Vui lòng quay lại sau!", "error");
  return;
 }

 // 3-second rate limiting
 const nowTs = Date.now();
 if (nowTs - lastAiChatTimestamp < 3000) {
  const waitSec = Math.ceil((3000 - (nowTs - lastAiChatTimestamp)) / 1000);
  showToast(`Vui lòng đợi ${waitSec} giây trước khi gửi câu hỏi tiếp theo cho Trợ lý AI!`, "info");
  return;
 }

 if (aiChatState.isTyping) return;
 const input = document.getElementById("ai-chat-input");
 if (!input) return;
 const text = input.value.trim();
 if (!text) return;

 // Input truncation check (max 2000 characters)
 if (text.length > (AI_CONFIG.MAX_INPUT_LENGTH || 2000)) {
  showToast(`Câu hỏi quá dài (tối đa ${AI_CONFIG.MAX_INPUT_LENGTH || 2000} ký tự). Vui lòng rút gọn câu hỏi!`, "error");
  return;
 }

 lastAiChatTimestamp = nowTs;

 if (!aiChatState.activeSid) aiNewSession();
 const session = aiGetActive();
 if (!session) return;

 if (session.messages.length === 0) {
  session.title = text.length > 42 ? text.substring(0, 42) + "\u2026" : text;
 }

 const now = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
 session.messages.push({ role: "user", content: text, time: now });
 aiSaveSessions();
 renderAiSidebar();
 renderAiMessages();

 input.value = "";
 input.style.height = "auto";
 aiChatState.isTyping = true;
 const sendBtn = document.getElementById("ai-send-btn");
 if (sendBtn) sendBtn.disabled = true;
 input.disabled = true;
 showAiTyping();

 const historyMsgs = session.messages.slice(-AI_CONFIG.MAX_HISTORY);

 // Format messages for Gemini API
 const apiMessages = historyMsgs.map(m => ({
  role: m.role === "user" ? "user" : "model",
  parts: [{ text: m.content }]
 }));

 try {
  let reply = "";

  const proxyRes = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: apiMessages,
      systemInstruction: AI_CONFIG.SYSTEM_PROMPT
    })
  });

  if (!proxyRes.ok) {
    const err = await proxyRes.json().catch(() => ({}));
    throw new Error(err.error || `Lỗi phản hồi máy chủ (${proxyRes.status})`);
  }

  const proxyData = await proxyRes.json();
  if (proxyData.candidates && proxyData.candidates[0]?.content?.parts?.[0]?.text) {
    reply = proxyData.candidates[0].content.parts[0].text;
  } else {
    reply = "Xin lỗi, không nhận được phản hồi phù hợp. Vui lòng thử lại với câu hỏi khác!";
  }

  const t = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  session.messages.push({ role: "assistant", content: reply, time: t });
  aiSaveSessions();

 } catch (err) {
  const t = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  session.messages.push({ role: "assistant", content: `**Lỗi kết nối:** ${err.message}\n\nVui lòng kiểm tra lại kết nối mạng hoặc thử lại sau ít phút.`, time: t });
  aiSaveSessions();
 }

 hideAiTyping();
 aiChatState.isTyping = false;
 if (sendBtn) sendBtn.disabled = false;
 input.disabled = false;
 input.focus();
 renderAiSidebar();
 renderAiMessages();
}

function aiSendQuick(text) {
 if (!aiChatState.activeSid) aiNewSession();
 const input = document.getElementById("ai-chat-input");
 if (input) { input.value = text; aiSendMessage(); }
}

function aiToggleSidebar() {
 const sidebar = document.getElementById("ai-sidebar");
 if (sidebar) sidebar.classList.toggle("open");
}

// ===== INIT =====
function initAiChat() {
 if (window.__aiChatInitialized) {
  renderAiSidebar();
  if (aiChatState.activeSid) renderAiMessages();
  else renderAiWelcome();
  return;
 }
 window.__aiChatInitialized = true;
 aiLoadSessions();
 renderAiSidebar();
 if (aiChatState.sessions.length > 0) {
  aiChatState.activeSid = aiChatState.sessions[0].id;
  renderAiMessages();
 } else {
  renderAiWelcome();
 }

 const input = document.getElementById("ai-chat-input");
 if (input) {
  input.addEventListener("input", () => {
   input.style.height = "auto";
   input.style.height = Math.min(input.scrollHeight, 150) + "px";
  });
  input.addEventListener("keydown", (e) => {
   if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aiSendMessage(); }
  });
 }

 const sendBtn = document.getElementById("ai-send-btn");
 if (sendBtn) sendBtn.addEventListener("click", aiSendMessage);

 const newChatBtn = document.getElementById("ai-new-chat-btn");
 if (newChatBtn) newChatBtn.addEventListener("click", aiNewSession);

 const toggleBtn = document.getElementById("ai-sidebar-toggle");
 if (toggleBtn) toggleBtn.addEventListener("click", aiToggleSidebar);

 window.addEventListener("ai_mode_state_changed", () => {
  if (aiChatState.activeSid) renderAiMessages();
  else renderAiWelcome();
 });
 window.addEventListener("developer_settings_changed", () => {
  if (aiChatState.activeSid) renderAiMessages();
  else renderAiWelcome();
 });
}

// ===== GLOBAL EXPORTS FOR AI CHAT =====
window.aiNewSession = aiNewSession;
window.aiSelectSession = aiSelectSession;
window.aiDeleteSession = aiDeleteSession;
window.aiSendQuick = aiSendQuick;
window.aiSendMessage = aiSendMessage;
window.aiToggleSidebar = aiToggleSidebar;
window.toggleAiSidebar = aiToggleSidebar;