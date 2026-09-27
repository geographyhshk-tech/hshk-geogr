$htmlTest = @"
<!DOCTYPE html>
<html><body><pre id='log'></pre><script>
function log(msg) {
  document.getElementById('log').textContent += '\n' + msg;
  fetch('http://localhost:3000/api/test/log', { method: 'POST', body: msg }).catch(() => {});
}
window.onerror = function(e, url, line) { log('ERR: ' + e + ' (' + url + ':' + line + ')'); };
async function test() {
  const iframe = document.createElement('iframe');
  iframe.src = 'index.html';
  await new Promise(r => { iframe.onload = r; document.body.appendChild(iframe); });
  await new Promise(r => setTimeout(r, 2000));
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  log('Loaded index.html on file:// protocol');
  log('geoAuth exists: ' + Boolean(win.geoAuth));
  log('submitting register on file://...');
  doc.getElementById('auth-gate-tab-register-btn').click();
  doc.getElementById('gate-reg-fullname').value = 'Test File Protocol';
  const testMail = 'filetest_' + Date.now() + '@gmail.com';
  doc.getElementById('gate-reg-email').value = testMail;
  doc.getElementById('gate-reg-password').value = 'Password123!';
  doc.getElementById('gate-reg-usertype').value = 'Học sinh THCS';
  
  win.onerror = function(e, u, l) { log('IFRAME ERR: ' + e + ' at line ' + l); };
  doc.getElementById('btn-gate-register-submit').click();
  await new Promise(r => setTimeout(r, 800));
  const robotPane = doc.getElementById('auth-gate-robot-pane');
  log('Robot pane: ' + (robotPane ? robotPane.style.display : 'null'));
  const noBtn = doc.getElementById('btn-robot-answer-no');
  if (noBtn) {
    log('Clicking No button...');
    noBtn.click();
    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 600));
      const auth = win.geoAuth && win.geoAuth.isAuthenticated();
      log('Tick ' + i + ': isAuth=' + auth);
      if (auth) break;
    }
  }
}
window.onload = test;
</script></body></html>
"@

$runnerPath = "D:\hshk.geo\test_file_proto.html"
[System.IO.File]::WriteAllText($runnerPath, $htmlTest, [System.Text.Encoding]::UTF8)

$logFile = "D:\hshk.geo\test_page_out.txt"
Remove-Item $logFile -ErrorAction SilentlyContinue

$profile = "D:\hshk.geo\tmp_file_proto_" + (Get-Random)
$edge = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new", "--user-data-dir=$profile", "file:///D:/hshk.geo/test_file_proto.html" -PassThru
Start-Sleep -Seconds 14
Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $runnerPath -Force -ErrorAction SilentlyContinue

if (Test-Path $logFile) {
  Get-Content $logFile
  Remove-Item $logFile -Force -ErrorAction SilentlyContinue
}
