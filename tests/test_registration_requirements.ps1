$port = 3000
$logFile = Join-Path $PSScriptRoot "..\test_page_out.txt"
Remove-Item $logFile -Force -ErrorAction SilentlyContinue

$uniqueSuffix = Get-Date -Format "yyyyMMddHHmmss"
$validEmail = "student_geo_$uniqueSuffix@gmail.com"
$existingEmail = "hocsinh@gmail.com"

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

  log('=== TEST 1: ATTEMPT TO REGISTER EXISTING MEMBER ($existingEmail) ===');
  doc.getElementById('auth-gate-tab-register-btn').click();
  await new Promise(r => setTimeout(r, 300));

  doc.getElementById('gate-reg-fullname').value = 'Học Sinh Đã Tồn Tại';
  doc.getElementById('gate-reg-email').value = '$existingEmail';
  doc.getElementById('gate-reg-password').value = 'Matkhau123!';
  doc.getElementById('gate-reg-usertype').value = 'Học sinh THCS';

  let toastMsg = '';
  const origToast = win.showToast;
  win.showToast = function(msg, type) {
    toastMsg = msg;
    log('[TOAST ' + type + '] ' + msg);
    if (origToast) origToast(msg, type);
  };

  await win.submitAuthGateRegister();
  await new Promise(r => setTimeout(r, 600));

  const robotPaneAfterDup = doc.getElementById('auth-gate-robot-pane');
  const regPaneAfterDup = doc.getElementById('auth-gate-register-pane');
  const robotShownAfterDup = robotPaneAfterDup && robotPaneAfterDup.style.display === 'block';
  log('Robot pane shown after duplicate submit: ' + robotShownAfterDup);
  log('Register pane shown after duplicate submit: ' + (regPaneAfterDup && regPaneAfterDup.style.display === 'block'));

  const isDuplicateWarned = toastMsg.includes('th') && toastMsg.includes('Gmail');
  if (isDuplicateWarned && !robotShownAfterDup) {
    log('PASS TEST 1: Rejected existing account correctly with warning!');
  } else {
    log('FAIL TEST 1: toastMsg=' + toastMsg + ', robotShown=' + robotShownAfterDup);
  }

  await new Promise(r => setTimeout(r, 1000));

  log('=== TEST 2: REGISTER VALID NEW MEMBER ($validEmail) ===');
  doc.getElementById('gate-reg-fullname').value = 'Nguyễn Địa Lý Mới';
  doc.getElementById('gate-reg-email').value = '$validEmail';
  doc.getElementById('gate-reg-password').value = 'PassValid123!';
  doc.getElementById('gate-reg-usertype').value = 'Học sinh THCS';

  await win.submitAuthGateRegister();
  await new Promise(r => setTimeout(r, 400));

  const robotPaneNew = doc.getElementById('auth-gate-robot-pane');
  const robotShownNew = robotPaneNew && robotPaneNew.style.display === 'block';
  log('Robot pane shown for new valid user: ' + robotShownNew);

  if (!robotShownNew) {
    log('FAIL TEST 2: Robot pane did not show for valid new user!');
    return;
  }

  log('Clicking robot answer "no" (human)...');
  await win.handleRobotVerificationChoice('no');

  let success = false;
  for (let s = 1; s <= 20; s++) {
    await new Promise(r => setTimeout(r, 500));
    const isAuth = win.geoAuth && win.geoAuth.isAuthenticated();
    const curUser = win.geoAuth && win.geoAuth.currentUser;
    const overlay = doc.getElementById('auth-gate-overlay');
    const overlayHidden = overlay && (overlay.style.display === 'none' || overlay.classList.contains('hidden'));
    const isGuestLocked = doc.documentElement.classList.contains('geo-guest-locked');
    const isHomeActive = doc.getElementById('tab-view-home') && doc.getElementById('tab-view-home').classList.contains('active');

    log('Tick ' + s + ': isAuth=' + isAuth + ', overlayHidden=' + overlayHidden + ', isGuestLocked=' + isGuestLocked + ', isHomeActive=' + isHomeActive);

    if (isAuth && overlayHidden && !isGuestLocked && isHomeActive && curUser && curUser.email === '$validEmail') {
      log('PASS TEST 2: Account registered, Auth Gate unlocked, switched to Home tab!');
      success = true;
      break;
    }
  }

  if (!success) {
    log('FAIL TEST 2: Timed out waiting for auth completion or home redirect!');
    return;
  }

  log('=== TEST 3: VERIFY IN ADMIN MEMBER LIST ===');
  const allUsers = win.geoAuth.getAllUsers();
  const foundUser = allUsers.find(u => u && u.email && u.email.toLowerCase() === '$validEmail'.toLowerCase());
  log('User present in getAllUsers(): ' + Boolean(foundUser));

  if (foundUser) {
    log('PASS TEST 3: New account is present in member list!');
    log('ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    log('FAIL TEST 3: User not found in member list!');
  }
}

window.addEventListener('load', run);
</script></body></html>
"@

$runnerPath = Join-Path $PSScriptRoot "..\test_reg_req.html"
[System.IO.File]::WriteAllText($runnerPath, $html, [System.Text.Encoding]::UTF8)

$profile = Join-Path $PSScriptRoot ("..\tmp_chk_" + (Get-Random))
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "http://localhost:$port/test_reg_req.html" -PassThru
Start-Sleep -Seconds 22
Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
  Get-Content $logFile
  Remove-Item $logFile -Force -ErrorAction SilentlyContinue
}
