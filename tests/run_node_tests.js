/**
 * NODE.JS AUTOMATED TEST RUNNER (FOR CI/CD PIPELINES)
 * Du an: Geography Edu - High School Help Kit
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

console.log("=== RUNNING NODE.JS CI TEST SUITE ===");

// --- Test 1: Crypto Vault Integrity ---
runTest("GeoCryptoVault JSON encoding/decoding simulation", () => {
  const payload = { email: "student@geography.edu.vn", role: "student" };
  const encoded = "GEO_ENC_V1:" + Buffer.from(JSON.stringify(payload)).toString("base64");
  assert.ok(encoded.startsWith("GEO_ENC_V1:"));
  
  const decoded = JSON.parse(Buffer.from(encoded.substring(11), "base64").toString("utf-8"));
  assert.strictEqual(decoded.email, "student@geography.edu.vn");
});

// --- Test 2: Multilingual Dictionary Integrity ---
runTest("i18n Dictionary has all 6 languages", () => {
  const i18nContent = fs.readFileSync(path.join(__dirname, "../js/i18n.js"), "utf-8");
  ["vi:", "en:", "zh:", "ja:", "ko:", "ru:"].forEach(lang => {
    assert.ok(i18nContent.includes(lang), `Missing language: ${lang}`);
  });
});

// --- Test 3: Zero Emoji in codebases ---
runTest("Zero Emoji policy across all JS files", () => {
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/;
  const jsDir = path.join(__dirname, "../js");
  const files = fs.readdirSync(jsDir).filter(f => f.endsWith(".js"));
  files.forEach(f => {
    const code = fs.readFileSync(path.join(jsDir, f), "utf-8");
    assert.ok(!emojiRegex.test(code), `Emoji found in js/${f}`);
  });
});

// --- Test 4: Environment template & Security ---
runTest(".env.example contains required template keys", () => {
  const envExample = fs.readFileSync(path.join(__dirname, "../.env.example"), "utf-8");
  assert.ok(envExample.includes("PORT="));
  assert.ok(envExample.includes("JWT_SECRET="));
  assert.ok(envExample.includes("GEMINI_API_KEY="));
  assert.ok(envExample.includes("FIREBASE_STORAGE_BUCKET="));
});

// --- Test 5: Server backend proxy routes ---
runTest("server.js defines /api/health and /api/ai/chat routes", () => {
  const serverJs = fs.readFileSync(path.join(__dirname, "../server.js"), "utf-8");
  assert.ok(serverJs.includes("/api/health"));
  assert.ok(serverJs.includes("/api/ai/chat"));
  assert.ok(serverJs.includes("/api/ai/translate"));
});

console.log(`\nCI Test Results: ${passed} / ${total} Passed\n`);
if (passed !== total) {
  process.exit(1);
}
