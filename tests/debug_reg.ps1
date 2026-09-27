$port = 3000
$logFile = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logFile -Force -ErrorAction SilentlyContinue

$testEmail = "newtest_" + (Get-Date -Format "HHmmss") + "@gmail.com"

$html = @"
<!DOCTYPE html>
<html><body><pre id='log'></pre><script>
function log(msg) {
  document.getElementById('log').textContent += '\n' + msg;
  fetch('/api/test/log', { method: 'POST', body: msg }).catch(() => {});
}
window.onerror = function(e, url, line) { log('WINDOW ERROR: ' + e + ' (' + url + ':' + line + ')'); };
async function run() {
  const iframe = document.createElement('iframe');
  iframe.src = 'index.html';
  iframe.style.width = '1280px';
  iframe.style.height = '900px';
  await new Promise(r => { iframe.onload = r; document.body.appendChild(iframe); });
  await new Promise(r => setTimeout(r, 2000));
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;

  win.onerror = function(e, url, line) { log('IFRAME ERROR: ' + e + ' (' + url + ':' + line + ')'); };

  log('[STEP 1] Switching to register tab...');
  doc.getElementById('auth-gate-tab-register-btn').click();
  await new Promise(r => setTimeout(r, 400));

  log('[STEP 2] Filling in register form with: $testEmail');
  doc.getElementById('gate-reg-fullname').value = 'Test User Mới';
  doc.getElementById('gate-reg-email').value = '$testEmail';
  doc.getElementById('gate-reg-password').value = 'Password123!';
  doc.getElementById('gate-reg-usertype').value = 'Học sinh THCS';

  log('[STEP 3] Clicking submit register button...');
  doc.getElementById('btn-gate-register-submit').click();
  await new Promise(r => setTimeout(r, 500));

  const robotPane = doc.getElementById('auth-gate-robot-pane');
  log('Robot pane display: ' + (robotPane ? robotPane.style.display : 'null'));

  log('[STEP 4] Clicking "Không" (Human choice)...');
  const noBtn = doc.getElementById('btn-robot-answer-no');
  if (noBtn) {
    noBtn.click();
  } else {
    log('ERROR: noBtn not found!');
  }

  for (let s = 1; s <= 15; s++) {
    await new Promise(r => setTimeout(r, 600));
    const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
    const curUser = win.geoAuth && win.geoAuth.currentUser;
    const overlay = doc.getElementById('auth-gate-overlay');
    const overlayHidden = overlay && (overlay.style.display === 'none' || overlay.classList.contains('hidden'));
    const toast = doc.getElementById('toast-container');
    const toastText = toast ? toast.innerText.trim() : '';

    log('Tick ' + s + ': isAuth=' + isAuth + ', overlayHidden=' + overlayHidden + ', toast=' + toastText);
    if (isAuth && overlayHidden) {
      log('SUCCESS: User registered and logged in! User: ' + JSON.stringify(curUser));
      break;
    }
  }

  // STEP 5: Now test if Admin table shows this user!
  log('\n[STEP 5] Testing if Admin Dashboard sees this new user...');
  await win.geoAuth.logout();
  await new Promise(r => setTimeout(r, 400));

  doc.getElementById('gate-login-email').value = 'vut510624@gmail.com';
  doc.getElementById('gate-login-password').value = '098397487818112010';
  doc.getElementById('btn-gate-login-submit').click();
  await new Promise(r => setTimeout(r, 800));

  log('Admin isAuth: ' + win.geoAuth.isAuthenticated());
  if (win.switchTab) win.switchTab('admin-panel');
  await new Promise(r => setTimeout(r, 800));

  const allUsers = win.geoAuth.getAllUsers();
  log('AllUsers count in memory: ' + allUsers.length);
  const foundUser = allUsers.find(u => u.email === '$testEmail');
  log('Found in getAllUsers: ' + Boolean(foundUser));

  const tableBody = doc.getElementById('admin-users-table-body');
  const tableText = tableBody ? tableBody.innerText : '';
  log('Found in admin table HTML: ' + tableText.includes('$testEmail'));
}
window.addEventListener('load', run);
</script></body></html>
"@

$runnerPath = Join-Path $PSScriptRoot "..\test_reg_debug.html"
[System.IO.File]::WriteAllText($runnerPath, $html, [System.Text.Encoding]::UTF8)

$profile = Join-Path $PSScriptRoot ("..\tmp_reg_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "http://localhost:$port/test_reg_debug.html" -PassThru
Start-Sleep -Seconds 16
Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
  Get-Content $logFile
  Remove-Item $logFile -Force -ErrorAction SilentlyContinue
}
