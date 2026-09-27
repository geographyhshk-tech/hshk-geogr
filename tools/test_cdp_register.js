const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const profileDir = path.join(__dirname, '..', 'tmp_edge_cdp_' + Date.now());
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    'http://localhost:3000/index.html'
  ], { detached: false });

  console.log('Edge spawned. Waiting for CDP port...');
  let pageWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://localhost:9222/json/list');
      if (res.ok) {
        const pages = await res.json();
        const target = pages.find(p => p.url && p.url.includes('3000'));
        if (target && target.webSocketDebuggerUrl) {
          pageWsUrl = target.webSocketDebuggerUrl;
          console.log('Found target page WebSocket:', pageWsUrl);
          break;
        }
      }
    } catch (e) {}
  }

  if (!pageWsUrl) {
    console.error('Failed to get CDP WebSocket URL');
    edge.kill();
    return;
  }

  const ws = new WebSocket(pageWsUrl);
  await new Promise(r => ws.onopen = r);
  console.log('Connected to CDP WebSocket');

  let idCounter = 1;
  const pendingRequests = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      resolve(msg);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.log(`[PAGE CONSOLE ${msg.params.type}]`, args);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[PAGE EXCEPTION]', JSON.stringify(msg.params.exceptionDetails));
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.result && res.result.exceptionDetails) {
      console.error('Eval Exception:', res.result.exceptionDetails);
    }
    return res.result && res.result.result ? res.result.result.value : null;
  }

  await send('Runtime.enable');
  await send('Console.enable');

  console.log('Waiting 2s for page scripts to load...');
  await sleep(2000);

  console.log('\n--- 1. Checking Initial State ---');
  let state = await evaluate(`({
    title: document.title,
    isAuth: window.geoAuth ? window.geoAuth.isAuthenticated() : null,
    overlayDisplay: document.getElementById('auth-gate-overlay')?.style.display,
    regTabBtn: Boolean(document.getElementById('auth-gate-tab-register-btn')),
    regPaneDisplay: document.getElementById('auth-gate-register-pane')?.style.display,
    robotPaneDisplay: document.getElementById('auth-gate-robot-pane')?.style.display
  })`);
  console.log('Initial State:', state);

  console.log('\n--- 2. Switching to Register Tab ---');
  await evaluate(`document.getElementById('auth-gate-tab-register-btn').click()`);
  await sleep(400);

  state = await evaluate(`({
    regPaneDisplay: document.getElementById('auth-gate-register-pane')?.style.display,
    robotPaneDisplay: document.getElementById('auth-gate-robot-pane')?.style.display
  })`);
  console.log('After Tab Switch:', state);

  console.log('\n--- 3. Testing Validation with Empty Submit ---');
  await evaluate(`document.getElementById('btn-gate-register-submit').click()`);
  await sleep(400);

  let toast = await evaluate(`document.getElementById('toast-container')?.innerText.trim()`);
  console.log('Toast after empty submit:', toast);

  console.log('\n--- 4. Filling Form with Valid Credentials ---');
  const testEmail = 'cdp_test_' + Date.now() + '@gmail.com';
  await evaluate(`
    document.getElementById('gate-reg-fullname').value = 'Nguyen Van CDP';
    document.getElementById('gate-reg-email').value = '${testEmail}';
    document.getElementById('gate-reg-password').value = 'Password123!';
    document.getElementById('gate-reg-usertype').value = 'Học sinh THCS';
  `);

  console.log('Clicking Register Submit Button...');
  await evaluate(`document.getElementById('btn-gate-register-submit').click()`);
  await sleep(800);

  state = await evaluate(`({
    regPaneDisplay: document.getElementById('auth-gate-register-pane')?.style.display,
    robotPaneDisplay: document.getElementById('auth-gate-robot-pane')?.style.display,
    pending: window._pendingRegistrationData,
    toast: document.getElementById('toast-container')?.innerText.trim()
  })`);
  console.log('State after Register Click:', state);

  console.log('\n--- 5. Clicking "Không" (Human Button) ---');
  await evaluate(`document.getElementById('btn-robot-answer-no').click()`);

  for (let s = 1; s <= 12; s++) {
    await sleep(600);
    const check = await evaluate(`({
      isAuth: window.geoAuth ? window.geoAuth.isAuthenticated() : null,
      currentUser: window.geoAuth ? window.geoAuth.currentUser : null,
      overlayDisplay: document.getElementById('auth-gate-overlay')?.style.display,
      toast: document.getElementById('toast-container')?.innerText.trim()
    })`);
    console.log(`[T+${s * 600}ms]`, check);
    if (check.isAuth && check.overlayDisplay === 'none') {
      console.log('\n>>> REGISTRATION SUCCESS! User:', check.currentUser?.email);
      break;
    }
  }

  ws.close();
  edge.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
  console.log('\nTest completed.');
}

main().catch(console.error);
