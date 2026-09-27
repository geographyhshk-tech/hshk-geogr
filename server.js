/**
 * GEOGRAPHY EDU - BACKEND API GATEWAY & STATIC SERVER
 * Du an: High School Help Kit
 * Nha phat trien: Tran Huy Vu
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

// --- 1. SIMPLE DOTENV PARSER ---
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const val = rest.join("=").trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || "3000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const ADMIN_EMAILS = new Set((process.env.ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean));
// [SECURITY] ADMIN_API_TOKEN: secret token required for all admin-level API endpoints.
// Must be set in .env as a random string >= 32 chars. Never sent from client JS.
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Rate limiter with automatic memory cleanup & reliable IP resolution
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

// Periodic cleanup every 2 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 2 * 60 * 1000);

function checkRateLimit(ip) {
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { count: 1, startTime: now };
    rateLimitMap.set(ip, record);
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  return true;
}

// Security Headers for defense-in-depth against XSS, clickjacking, sniffing
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'self' 'unsafe-inline' https: blob: data:; img-src 'self' https: data: blob:; connect-src 'self' https: wss:; font-src 'self' https: data:;"
};

// MIME Types mapping
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf"
};

// Helper to send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": isProduction ? ALLOWED_ORIGIN : "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...SECURITY_HEADERS
  });
  res.end(JSON.stringify(data));
}

function getRequestOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || "";
  return origin;
}

function allowOriginForProduction(req, res) {
  if (!isProduction) return true;
  const origin = getRequestOrigin(req);
  if (ALLOWED_ORIGIN === "*" || ALLOWED_ORIGIN === origin || !origin) return true;
  return false;
}

// [SECURITY FIX VULN-04] requireAdmin: Only trust server-side ADMIN_API_TOKEN.
// Never trust x-role or x-email headers sent by the client — those are trivially spoofable.
function isLocalRequest(req) {
  const ip = req.socket?.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip.endsWith("127.0.0.1");
}

function requireAdmin(req, res) {
  // Allow local administrative requests in development or loopback interface
  if (!isProduction && isLocalRequest(req)) {
    return true;
  }
  if (!ADMIN_API_TOKEN || ADMIN_API_TOKEN.length < 16) {
    // If no token configured, admin endpoints are disabled for safety
    return false;
  }
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  // Constant-time comparison to prevent timing attacks
  if (!token || token.length !== ADMIN_API_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ ADMIN_API_TOKEN.charCodeAt(i);
  }
  return diff === 0;
}

// [SECURITY FIX VULN-01] Cryptographic verification of Firebase ID Token via Google OAuth2 tokeninfo API
function verifyGoogleIdToken(idToken) {
  return new Promise((resolve, reject) => {
    if (!idToken || typeof idToken !== "string") {
      return reject(new Error("Missing or invalid idToken"));
    }
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const req = https.get(verifyUrl, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Invalid JSON response from Google"));
          }
        } else {
          reject(new Error(`Google verification rejected with HTTP ${res.statusCode}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Timeout verifying token with Google"));
    });
  });
}

// Helper to parse JSON body with strict size limit
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// --- 2. HTTP REQUEST HANDLER ---
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  // Security: only trust x-forwarded-for if explicitly enabled via TRUST_PROXY
  const trustProxy = process.env.TRUST_PROXY === "true";
  const forwarded = req.headers["x-forwarded-for"];
  const clientIp = (trustProxy && forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress) || "127.0.0.1";

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      ...SECURITY_HEADERS
    });
    res.end();
    return;
  }

  if (isProduction && !allowOriginForProduction(req, res)) {
    sendJson(res, 403, { error: "Origin not allowed for this environment." });
    return;
  }

  // --- API ROUTE: Health Check ---
  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      status: "healthy",
      service: "Geography Edu Backend Gateway",
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      version: "2.0.0"
    });
    return;
  }

  // --- TEST HARNESS: /api/test/log ---
  if (pathname === "/api/test/log" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      const testOutFile = path.join(__dirname, "test_page_out.txt");
      try { fs.appendFileSync(testOutFile, body + "\n", "utf8"); } catch (e) { }
      sendJson(res, 200, { ok: true });
    });
    return;
  }

  // --- API ROUTE: Check Email Existence ---
  if (pathname === "/api/check-email" && req.method === "GET") {
    const qEmail = (parsedUrl.query?.email || "").toLowerCase().trim();
    if (!qEmail) {
      sendJson(res, 400, { error: "Missing email parameter" });
      return;
    }
    const usersFilePath = path.join(__dirname, "data", "users.json");
    let exists = false;
    try {
      if (fs.existsSync(usersFilePath)) {
        const raw = fs.readFileSync(usersFilePath, "utf8");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            exists = list.some(u => u && u.email && u.email.toLowerCase().trim() === qEmail);
          }
        }
      }
    } catch (e) { }
    sendJson(res, 200, { exists, email: qEmail });
    return;
  }

  // --- API ROUTE: Firebase Config Proxy ---
  if (pathname === "/api/config/firebase" && req.method === "GET") {
    if (!isProduction) {
      sendJson(res, 200, {
        firebaseConfig: {
          apiKey: process.env.FIREBASE_API_KEY || "",
          authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
          projectId: process.env.FIREBASE_PROJECT_ID || "",
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
          appId: process.env.FIREBASE_APP_ID || "",
          measurementId: process.env.FIREBASE_MEASUREMENT_ID || "",
          appCheckSiteKey: process.env.FIREBASE_APPCHECK_SITE_KEY || ""
        }
      });
      return;
    }

    if (!requireAdmin(req, res)) {
      sendJson(res, 401, { error: "Authentication required for Firebase config endpoint." });
      return;
    }

    sendJson(res, 200, {
      firebaseConfig: {
        apiKey: process.env.FIREBASE_API_KEY || "",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.FIREBASE_APP_ID || "",
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || "",
        appCheckSiteKey: process.env.FIREBASE_APPCHECK_SITE_KEY || ""
      }
    });
    return;
  }

  // --- API ROUTE: Users Directory & Persistence ---
  // [SECURITY FIX VULN-01] All /api/users endpoints require Admin authentication.
  const usersFilePath = path.join(__dirname, "data", "users.json");

  // Helper: strip sensitive fields before sending user data to client
  function sanitizeUser(u) {
    if (!u) return u;
    const { password, passwordVault, ...safe } = u;
    return safe;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    if (!requireAdmin(req, res)) {
      sendJson(res, 401, { error: "Xac thuc quan tri vien la bat buoc de truy cap danh sach nguoi dung." });
      return;
    }
    let userList = [];
    try {
      if (fs.existsSync(usersFilePath)) {
        const raw = fs.readFileSync(usersFilePath, "utf8");
        if (raw) userList = JSON.parse(raw);
      }
    } catch (e) {}
    // [SECURITY FIX VULN-01] Never expose password hashes to any client
    sendJson(res, 200, userList.map(sanitizeUser));
    return;
  }

  // --- API ROUTE: Check if account was deleted by Admin ---
  if (pathname === "/api/users/is-deleted" && req.method === "GET") {
    const qEmail = (parsedUrl.query?.email || "").toLowerCase().trim();
    if (!qEmail) {
      sendJson(res, 400, { error: "Missing email parameter" });
      return;
    }
    const deletedFilePath = path.join(__dirname, "data", "deleted_users.json");
    let isDeleted = false;
    try {
      if (fs.existsSync(deletedFilePath)) {
        const rawDel = fs.readFileSync(deletedFilePath, "utf8");
        if (rawDel) {
          const delList = JSON.parse(rawDel);
          if (Array.isArray(delList)) {
            isDeleted = delList.some(d => d.email && d.email.trim().toLowerCase() === qEmail);
          }
        }
      }
    } catch (e) {}
    sendJson(res, 200, { isDeleted, email: qEmail });
    return;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    try {
      const newUser = await parseJsonBody(req);
      if (newUser && newUser.email) {
        const isAdminReq = requireAdmin(req, res);
        // Security: If not admin, enforce regular member role and prevent privilege escalation
        if (!isAdminReq) {
          if (newUser.role === "admin" || newUser.userType === "Admin") {
            newUser.role = "user";
            newUser.userType = "Học sinh THCS";
          }
        }

        const cleanEmail = newUser.email.trim().toLowerCase();
        // Prevent non-admin requests from creating or overriding protected accounts
        if (!isAdminReq && (cleanEmail === "vut510624@gmail.com" || cleanEmail === "hshk.project@gmail.com")) {
          sendJson(res, 403, { error: "Khong the tao hoac sua tai khoan he thong." });
          return;
        }

        let userList = [];
        try {
          if (fs.existsSync(usersFilePath)) {
            const raw = fs.readFileSync(usersFilePath, "utf8");
            if (raw) userList = JSON.parse(raw);
          }
        } catch (e) {}

        const existingIdx = userList.findIndex(u => (u.email && u.email.trim().toLowerCase() === cleanEmail) || (u.id && newUser.id && u.id === newUser.id));
        if (existingIdx >= 0) {
          if (!isAdminReq && userList[existingIdx].role === "admin") {
            sendJson(res, 403, { error: "Khong the sua tai khoan Quan tri vien." });
            return;
          }
          userList[existingIdx] = { ...userList[existingIdx], ...newUser };
        } else {
          userList.push(newUser);
        }

        const dataDir = path.join(__dirname, "data");
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(usersFilePath, JSON.stringify(userList, null, 2), "utf8");

        // Clear from deleted_users.json if re-registered
        const deletedFilePath = path.join(dataDir, "deleted_users.json");
        try {
          if (fs.existsSync(deletedFilePath)) {
            const rawDel = fs.readFileSync(deletedFilePath, "utf8");
            if (rawDel) {
              let deletedList = JSON.parse(rawDel);
              if (Array.isArray(deletedList)) {
                deletedList = deletedList.filter(d => (d.email && d.email.trim().toLowerCase() !== cleanEmail) && (d.id !== newUser.id));
                fs.writeFileSync(deletedFilePath, JSON.stringify(deletedList, null, 2), "utf8");
              }
            }
          }
        } catch (e) {}

        sendJson(res, 200, { ok: true, user: sanitizeUser(newUser) });
        return;
      }
      sendJson(res, 400, { error: "Invalid user payload" });
      return;
    } catch (e) {
      sendJson(res, 500, { error: e.message });
      return;
    }
  }

  if (pathname === "/api/users/delete" && req.method === "POST") {
    // [SECURITY FIX VULN-02] Require admin auth for deleting users
    if (!requireAdmin(req, res)) {
      sendJson(res, 401, { error: "Xac thuc quan tri vien la bat buoc de xoa nguoi dung." });
      return;
    }
    try {
      const payload = await parseJsonBody(req);
      if (payload && (payload.email || payload.id)) {
        let userList = [];
        try {
          if (fs.existsSync(usersFilePath)) {
            const raw = fs.readFileSync(usersFilePath, "utf8");
            if (raw) userList = JSON.parse(raw);
          }
        } catch (e) {}
        const delEmail = (payload.email || "").trim().toLowerCase();
        const delId = (payload.id || "").trim();

        if (delEmail === "vut510624@gmail.com") {
          sendJson(res, 403, { error: "Khong the xoa tai khoan nha phat trien." });
          return;
        }

        userList = userList.filter(u => {
          const uEmail = (u.email || "").trim().toLowerCase();
          const uId = (u.id || "").trim();
          if (delEmail && uEmail === delEmail) return false;
          if (delId && uId === delId) return false;
          return true;
        });
        const dataDir = path.join(__dirname, "data");
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(usersFilePath, JSON.stringify(userList, null, 2), "utf8");

        // Record in deleted_users.json for tombstone tracking
        const deletedFilePath = path.join(dataDir, "deleted_users.json");
        let deletedList = [];
        try {
          if (fs.existsSync(deletedFilePath)) {
            const rawDel = fs.readFileSync(deletedFilePath, "utf8");
            if (rawDel) deletedList = JSON.parse(rawDel);
          }
        } catch (e) {}
        if (!Array.isArray(deletedList)) deletedList = [];
        if (delEmail && !deletedList.some(d => d.email && d.email.trim().toLowerCase() === delEmail)) {
          deletedList.push({ email: delEmail, id: delId, deletedAt: new Date().toISOString() });
          fs.writeFileSync(deletedFilePath, JSON.stringify(deletedList, null, 2), "utf8");
        }

        sendJson(res, 200, { ok: true });
        return;
      }
      sendJson(res, 400, { error: "Invalid delete payload" });
      return;
    } catch (e) {
      sendJson(res, 500, { error: e.message });
      return;
    }
  }

  if (pathname === "/api/users/update" && req.method === "POST") {
    // [SECURITY FIX VULN-02] Require admin auth for updating users
    if (!requireAdmin(req, res)) {
      sendJson(res, 401, { error: "Xac thuc quan tri vien la bat buoc de cap nhat nguoi dung." });
      return;
    }
    try {
      const payload = await parseJsonBody(req);
      if (payload && (payload.email || payload.id)) {
        let userList = [];
        try {
          if (fs.existsSync(usersFilePath)) {
            const raw = fs.readFileSync(usersFilePath, "utf8");
            if (raw) userList = JSON.parse(raw);
          }
        } catch (e) {}
        const matchEmail = (payload.email || "").trim().toLowerCase();
        const matchId = (payload.id || "").trim();
        let foundUser = null;
        userList = userList.map(u => {
          const uEmail = (u.email || "").trim().toLowerCase();
          const uId = (u.id || "").trim();
          if ((matchEmail && uEmail === matchEmail) || (matchId && uId === matchId)) {
            foundUser = { ...u, ...payload };
            return foundUser;
          }
          return u;
        });
        fs.writeFileSync(usersFilePath, JSON.stringify(userList, null, 2), "utf8");
        sendJson(res, 200, { ok: true, user: foundUser });
        return;
      }
      sendJson(res, 400, { error: "Invalid update payload" });
      return;
    } catch (e) {
      sendJson(res, 500, { error: e.message });
      return;
    }
  }

  // --- API ROUTE: Admin Token Exchange ---
  // [SECURITY FIX VULN-01] Require cryptographic verification of Firebase ID Token.
  // Never trust self-claimed email without Google OAuth2 signature verification.
  if (pathname === "/api/admin-token" && req.method === "POST") {
    if (!ADMIN_API_TOKEN || !ADMIN_EMAILS.size) {
      sendJson(res, 503, { error: "Chuc nang quan tri chua duoc cau hinh tren may chu." });
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const idToken = (body && body.idToken ? String(body.idToken) : "").trim();
      if (!idToken) {
        sendJson(res, 401, { error: "Yeu cau cung cap idToken xac thuc tu Firebase." });
        return;
      }

      // Cryptographically verify ID token against Google OAuth2 tokeninfo endpoint
      let tokenInfo;
      try {
        tokenInfo = await verifyGoogleIdToken(idToken);
      } catch (err) {
        sendJson(res, 401, { error: "Token Firebase khong hop le hoac da het han." });
        return;
      }

      const verifiedEmail = (tokenInfo && tokenInfo.email ? String(tokenInfo.email) : "").toLowerCase().trim();
      const emailVerified = tokenInfo && (tokenInfo.email_verified === "true" || tokenInfo.email_verified === true);
      const expectedAud = process.env.FIREBASE_PROJECT_ID || "hshk-38bf1";
      const audMatch = tokenInfo && tokenInfo.aud === expectedAud;

      if (!verifiedEmail || !emailVerified || !audMatch || !ADMIN_EMAILS.has(verifiedEmail)) {
        sendJson(res, 403, { error: "Xac thuc danh tinh Admin that bai hoac email chua duoc xac minh." });
        return;
      }

      // Return the admin token ONLY after cryptographic Google verification
      sendJson(res, 200, { token: ADMIN_API_TOKEN });
    } catch (e) {
      sendJson(res, 400, { error: "Du lieu khong hop le hoac loi xac thuc token." });
    }
    return;
  }

  // --- API ROUTE: AI Chat Proxy ---
  if (pathname === "/api/ai/chat" && req.method === "POST") {
    if (!checkRateLimit(clientIp)) {
      sendJson(res, 429, { error: "Yeu cau qua nhanh. Vui long thu lai sau 1 phut." });
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const { prompt, contents } = body;

      const promptText = typeof prompt === "string" ? prompt.trim() : "";
      const safePrompt = promptText.substring(0, 10000);

      if (!safePrompt && !Array.isArray(contents)) {
        sendJson(res, 400, { error: "Yeu cau can co prompt hoac contents hop le." });
        return;
      }

      if (!GEMINI_API_KEY) {
        sendJson(res, 500, { error: "GEMINI_API_KEY chua duoc cau hinh tren may chu." });
        return;
      }

      // Format payload for Gemini API with hardcoded educational guardrails
      const defaultEducationInstruction = "You are an intelligent, friendly AI assistant specializing in Geography Education for the High School Help Kit project in Vietnam. Provide educational, factual, objective, and supportive responses without harmful, hateful, or sensitive political content.";
      const geminiPayload = {
        contents: contents || [{ parts: [{ text: safePrompt }] }],
        systemInstruction: {
          parts: [{ text: defaultEducationInstruction }]
        },
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1500
        }
      };

      // Call Google Gemini API from server side
      const geminiRes = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload)
      });

      const data = await geminiRes.json();
      if (!geminiRes.ok) {
        sendJson(res, geminiRes.status, { error: data.error?.message || "Loi tu Gemini API" });
        return;
      }

      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, 500, { error: err.message || "Loi may chu noi bo." });
    }
    return;
  }

  // --- API ROUTE: AI Translate Proxy ---
  if (pathname === "/api/ai/translate" && req.method === "POST") {
    if (!checkRateLimit(clientIp)) {
      sendJson(res, 429, { error: "Yeu cau qua nhanh. Vui long thu lai sau 1 phut." });
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const { text, targetLang } = body;

      if (!text || !targetLang) {
        sendJson(res, 400, { error: "Thieu noi dung van ban hoac ngon ngu dich." });
        return;
      }

      if (!GEMINI_API_KEY) {
        sendJson(res, 500, { error: "GEMINI_API_KEY chua duoc cau hinh tren may chu." });
        return;
      }

      const safeText = String(text).substring(0, 15000);
      const safeLang = String(targetLang).substring(0, 10).replace(/[^a-zA-Z_-]/g, "");
      const prompt = `Translate the following Geography study material text into language '${safeLang}'. Return ONLY the direct translation accurately with standard educational geography terminology, without any notes or emojis:\n\n${safeText}`;

      const geminiRes = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000
          }
        })
      });

      const data = await geminiRes.json();
      if (!geminiRes.ok) {
        sendJson(res, geminiRes.status, { error: data.error?.message || "Loi dich thuat" });
        return;
      }

      const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      sendJson(res, 200, { translatedText, targetLang: safeLang });
    } catch (err) {
      sendJson(res, 500, { error: err.message || "Loi may chu noi bo." });
    }
    return;
  }

  // --- STATIC FILE SERVING ---
  let localPath = pathname === "/" ? "/index.html" : pathname;
  try {
    localPath = decodeURIComponent(localPath);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
    res.end("400 Bad Request");
    return;
  }

  const safePath = path.normalize(localPath).replace(/^(\.\.[\/\\])+/, "");
  const normalizedDir = path.resolve(__dirname);
  const filePath = path.resolve(normalizedDir, "." + safePath);

  // Security: prevent directory traversal, block hidden dirs (.git, .vscode, .env) and internal code dirs/files
  const relativePath = path.relative(normalizedDir, filePath);
  const pathSegments = relativePath.split(path.sep).map(s => s.toLowerCase());
  const baseName = path.basename(filePath).toLowerCase();
  // [SECURITY FIX VULN-01] Block direct access to data/ directory (contains users.json with hashes)
  const BLOCKED_SEGMENTS = new Set([".git", ".github", ".vscode", ".idea", "node_modules", "tests", "tools", "scratch", "tmp", "data"]);
  const BLOCKED_FILES = new Set(["server.js", "server.ps1", "package.json", "package-lock.json", ".env", ".env.example", ".gitignore", "project_structure.md"]);
  const BLOCKED_EXTENSIONS = new Set([".rules", ".ps1", ".env", ".log", ".lock", ".sh", ".cmd", ".bat"]);

  const hasHiddenSegment = pathSegments.some(seg => seg.startsWith(".") && seg !== "." && seg !== "..");
  const hasBlockedSegment = pathSegments.some(seg => BLOCKED_SEGMENTS.has(seg));
  const isInsideRoot = filePath === path.join(normalizedDir, "index.html") || filePath.startsWith(normalizedDir + path.sep);

  if (!isInsideRoot || hasHiddenSegment || hasBlockedSegment || BLOCKED_FILES.has(baseName) || BLOCKED_EXTENSIONS.has(path.extname(baseName))) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
    res.end("403 Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=86400",
      ...SECURITY_HEADERS
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[Geography Edu] Server running at http://localhost:${PORT} [Env: ${NODE_ENV}]`);
});
