const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index.html');
const partialsDir = path.join(__dirname, '../src/partials');

if (!fs.existsSync(partialsDir)) {
  fs.mkdirSync(partialsDir, { recursive: true });
}

const html = fs.readFileSync(indexPath, 'utf-8');
const lines = html.split('\n');

// Find markers
const markers = [
  { name: '01_head.html', start: 0, endMarker: '<div id="auth-gate-overlay"' },
  { name: '02_auth_gate.html', startMarker: '<div id="auth-gate-overlay"', endMarker: '<header class="site-header"' },
  { name: '03_header_nav.html', startMarker: '<header class="site-header"', endMarker: '<div class="tab-view active" id="tab-view-home">' },
  { name: '04_tab_home.html', startMarker: '<div class="tab-view active" id="tab-view-home">', endMarker: '<div class="tab-view" id="tab-view-documents">' },
  { name: '05_tab_docs.html', startMarker: '<div class="tab-view" id="tab-view-documents">', endMarker: '<div class="tab-view" id="tab-view-saved">' },
  { name: '06_tab_saved.html', startMarker: '<div class="tab-view" id="tab-view-saved">', endMarker: '<div class="tab-view" id="tab-view-contact">' },
  { name: '07_tab_contact.html', startMarker: '<div class="tab-view" id="tab-view-contact">', endMarker: '<div class="tab-view" id="tab-view-ai-chat">' },
  { name: '08_tab_ai_chat.html', startMarker: '<div class="tab-view" id="tab-view-ai-chat">', endMarker: '<div class="tab-view" id="tab-view-admin-panel">' },
  { name: '09_tab_admin.html', startMarker: '<div class="tab-view" id="tab-view-admin-panel">', endMarker: '<div class="modal-backdrop" id="modal-register">' },
  { name: '10_modals.html', startMarker: '<div class="modal-backdrop" id="modal-register">', endMarker: '<section id="section-globe"' },
  { name: '11_section_globe.html', startMarker: '<section id="section-globe"', endMarker: '<!-- Firebase SDK' },
  { name: '12_scripts.html', startMarker: '<!-- Firebase SDK', end: lines.length }
];

let currentIndex = 0;
const sections = [];

markers.forEach((m, idx) => {
  let startLine = m.start !== undefined ? m.start : -1;
  let endLine = m.end !== undefined ? m.end : -1;

  if (startLine === -1) {
    for (let i = currentIndex; i < lines.length; i++) {
      if (lines[i].includes(m.startMarker)) {
        startLine = i;
        break;
      }
    }
  }

  if (endLine === -1) {
    for (let i = startLine + 1; i < lines.length; i++) {
      if (lines[i].includes(m.endMarker)) {
        endLine = i;
        break;
      }
    }
  }

  if (startLine === -1 || endLine === -1) {
    console.error('Failed to locate marker for:', m.name, { startLine, endLine, startMarker: m.startMarker, endMarker: m.endMarker });
    process.exit(1);
  }

  const content = lines.slice(startLine, endLine).join('\n');
  fs.writeFileSync(path.join(partialsDir, m.name), content, 'utf-8');
  console.log(`Saved ${m.name}: lines ${startLine + 1} to ${endLine} (${endLine - startLine} lines)`);

  currentIndex = endLine;
});

console.log('Successfully split index.html into src/partials/*.html!');
