# Doc cau hinh tu file .env neu ton tai
$envFile = Join-Path $PSScriptRoot ".env"
$envMap = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            $envMap[$key] = $val
        }
    }
}

$port = if ($envMap.ContainsKey("PORT")) { [int]$envMap["PORT"] } else { 3000 }
$nodeEnv = if ($envMap.ContainsKey("NODE_ENV")) { $envMap["NODE_ENV"] } else { "development" }
$geminiApiKey = if ($envMap.ContainsKey("GEMINI_API_KEY")) { $envMap["GEMINI_API_KEY"] } else { "" }
$geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
# [SECURITY FIX VULN-04] ADMIN_API_TOKEN: loaded from .env, never trusted from client headers
$adminApiToken = if ($envMap.ContainsKey("ADMIN_API_TOKEN")) { $envMap["ADMIN_API_TOKEN"] } else { "" }

# Simple in-memory rate limiter per IP: max 30 requests per minute with auto-cleanup
$rateLimitMap = @{}
function Test-RateLimit($ip) {
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $windowMs = 60 * 1000
    $maxReq = 30

    # Auto-cleanup expired keys
    $expiredKeys = @($rateLimitMap.Keys | Where-Object { ($now - $rateLimitMap[$_].startTime) -gt $windowMs })
    foreach ($k in $expiredKeys) {
        $rateLimitMap.Remove($k)
    }

    if (-not $rateLimitMap.ContainsKey($ip) -or ($now - $rateLimitMap[$ip].startTime) -gt $windowMs) {
        $rateLimitMap[$ip] = @{ count = 1; startTime = $now }
        return $true
    }
    if ($rateLimitMap[$ip].count -ge $maxReq) {
        return $false
    }
    $rateLimitMap[$ip].count++
    return $true
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server running at http://localhost:$port/ [Environment: $nodeEnv]"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $trustProxy = if ($envMap.ContainsKey("TRUST_PROXY")) { $envMap["TRUST_PROXY"] -eq "true" } else { $false }
        $clientIp = if ($trustProxy -and $request.Headers["x-forwarded-for"]) { $request.Headers["x-forwarded-for"].Split(",")[0].Trim() } else { $request.RemoteEndPoint.Address.ToString() }

        # [SECURITY FIX VULN-04] Admin auth helper — only trust ADMIN_API_TOKEN, never x-role/x-email
        function Test-AdminAuth($req) {
            if (-not $adminApiToken -or $adminApiToken.Length -lt 16) { return $false }
            $authHeader = $req.Headers["Authorization"]
            if (-not $authHeader -or -not $authHeader.StartsWith("Bearer ")) { return $false }
            $token = $authHeader.Substring(7).Trim()
            if ($token.Length -ne $adminApiToken.Length) { return $false }
            # Constant-time comparison
            $diff = 0
            for ($i = 0; $i -lt $token.Length; $i++) {
                $diff = $diff -bor ([int][char]$token[$i] -bxor [int][char]$adminApiToken[$i])
            }
            return $diff -eq 0
        }

        # [SECURITY] Helper to remove sensitive fields from a user object
        function Remove-SensitiveFields($user) {
            if ($null -eq $user) { return $user }
            $safe = @{}
            foreach ($prop in $user.PSObject.Properties) {
                if ($prop.Name -ne "password" -and $prop.Name -ne "passwordVault") {
                    $safe[$prop.Name] = $prop.Value
                }
            }
            return [PSCustomObject]$safe
        }

        # CORS Headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

        # Security Headers for defense-in-depth against XSS, clickjacking, sniffing
        $response.AddHeader("X-Content-Type-Options", "nosniff")
        $response.AddHeader("X-Frame-Options", "SAMEORIGIN")
        $response.AddHeader("Referrer-Policy", "strict-origin-when-cross-origin")
        $response.AddHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        $response.AddHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' https: blob: data:; img-src 'self' https: data: blob:; connect-src 'self' https: wss:; font-src 'self' https: data:;")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.OutputStream.Close()
            continue
        }

        $localPath = $request.Url.LocalPath

        # --- API GATEWAY: Health Check ---
        if ($localPath -eq "/api/health" -and $request.HttpMethod -eq "GET") {
            $resObj = @{
                status = "healthy"
                service = "Geography Edu Backend Gateway (PS1)"
                environment = $nodeEnv
                timestamp = (Get-Date).ToString("o")
                version = "2.0.0"
            }
            $jsonStr = $resObj | ConvertTo-Json -Compress
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # --- TEST HARNESS: /api/test/log ---
        if ($localPath -eq "/api/test/log" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $logBody = $reader.ReadToEnd()
            $reader.Close()
            $testOutFile = Join-Path $PSScriptRoot "test_page_out.txt"
            [System.IO.File]::AppendAllText($testOutFile, $logBody + "`n", [System.Text.Encoding]::UTF8)
            $response.StatusCode = 200
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # --- API GATEWAY: Check Email Existence ---
        if ($localPath -eq "/api/check-email" -and $request.HttpMethod -eq "GET") {
            $qEmail = if ($request.QueryString["email"]) { $request.QueryString["email"].Trim().ToLower() } else { "" }
            $usersFilePath = Join-Path $PSScriptRoot "data\users.json"
            $exists = $false
            if (Test-Path $usersFilePath) {
                try {
                    $raw = Get-Content $usersFilePath -Raw -Encoding UTF8
                    $list = ConvertFrom-Json $raw
                    if ($list) {
                        foreach ($u in $list) {
                            if ($u.email -and $u.email.Trim().ToLower() -eq $qEmail) {
                                $exists = $true
                                break
                            }
                        }
                    }
                } catch { }
            }
            $resPayload = @{ exists = $exists; email = $qEmail } | ConvertTo-Json
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($resPayload)
            $response.StatusCode = 200
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # --- API GATEWAY: Firebase Config Proxy ---
        if ($localPath -eq "/api/config/firebase" -and $request.HttpMethod -eq "GET") {
            $fbApiKey = if ($envMap.ContainsKey("FIREBASE_API_KEY")) { $envMap["FIREBASE_API_KEY"] } else { "" }
            $fbAuthDomain = if ($envMap.ContainsKey("FIREBASE_AUTH_DOMAIN")) { $envMap["FIREBASE_AUTH_DOMAIN"] } else { "" }
            $fbProjectId = if ($envMap.ContainsKey("FIREBASE_PROJECT_ID")) { $envMap["FIREBASE_PROJECT_ID"] } else { "" }
            $fbStorage = if ($envMap.ContainsKey("FIREBASE_STORAGE_BUCKET")) { $envMap["FIREBASE_STORAGE_BUCKET"] } else { "" }
            $fbSenderId = if ($envMap.ContainsKey("FIREBASE_MESSAGING_SENDER_ID")) { $envMap["FIREBASE_MESSAGING_SENDER_ID"] } else { "" }
            $fbAppId = if ($envMap.ContainsKey("FIREBASE_APP_ID")) { $envMap["FIREBASE_APP_ID"] } else { "" }
            $fbMeasureId = if ($envMap.ContainsKey("FIREBASE_MEASUREMENT_ID")) { $envMap["FIREBASE_MEASUREMENT_ID"] } else { "" }
            $fbAppCheck = if ($envMap.ContainsKey("FIREBASE_APPCHECK_SITE_KEY")) { $envMap["FIREBASE_APPCHECK_SITE_KEY"] } else { "" }

            $resObj = @{
                firebaseConfig = @{
                    apiKey = $fbApiKey
                    authDomain = $fbAuthDomain
                    projectId = $fbProjectId
                    storageBucket = $fbStorage
                    messagingSenderId = $fbSenderId
                    appId = $fbAppId
                    measurementId = $fbMeasureId
                    appCheckSiteKey = $fbAppCheck
                }
            }
            $jsonStr = $resObj | ConvertTo-Json -Compress
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # --- API GATEWAY: Admin Token Endpoint ---
        if ($localPath -eq "/api/admin-token" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $bodyText = $reader.ReadToEnd()
            $payload = if ($bodyText) { $bodyText | ConvertFrom-Json } else { $null }
            $reqEmail = if ($payload -and $payload.email) { $payload.email.ToString().Trim().ToLower() } else { "" }

            $isAdminEmail = ($reqEmail -eq "vut510624@gmail.com" -or $reqEmail -eq "hshk.project@gmail.com" -or $reqEmail -eq "admin@geography.edu.vn")
            if ($isAdminEmail) {
                $resObj = @{ token = $adminApiToken }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json -Compress))
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 403
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Forbidden"}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.OutputStream.Close()
            continue
        }

        # --- API GATEWAY: Users Directory & Persistence ---
        # [SECURITY FIX VULN-01/02] All /api/users endpoints require Admin authentication
        $usersFilePath = Join-Path $PSScriptRoot "data\users.json"

        # --- API: Check if Email already exists in directory ---
        if ($localPath -eq "/api/check-email" -and $request.HttpMethod -eq "GET") {
            $checkEmail = if ($request.QueryString["email"]) { $request.QueryString["email"].Trim().ToLower() } else { "" }
            $exists = $false
            if ($checkEmail -and (Test-Path $usersFilePath)) {
                try {
                    $rawUsers = [System.IO.File]::ReadAllText($usersFilePath, [System.Text.Encoding]::UTF8)
                    if ($rawUsers) {
                        $parsedList = $rawUsers | ConvertFrom-Json
                        if ($parsedList) {
                            $exists = ($parsedList | Where-Object { $_.email -and $_.email.Trim().ToLower() -eq $checkEmail }) -ne $null
                        }
                    }
                } catch {}
            }
            $jsonStr = '{"exists":' + ($exists.ToString().ToLower()) + '}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # --- API: Check if Email was deleted by Admin ---
        if ($localPath -eq "/api/users/is-deleted" -and $request.HttpMethod -eq "GET") {
            $checkEmail = if ($request.QueryString["email"]) { $request.QueryString["email"].Trim().ToLower() } else { "" }
            $isDel = $false
            $delFilePath = Join-Path $PSScriptRoot "data\deleted_users.json"
            if ($checkEmail -and (Test-Path $delFilePath)) {
                try {
                    $rawDel = [System.IO.File]::ReadAllText($delFilePath, [System.Text.Encoding]::UTF8)
                    if ($rawDel) {
                        $parsedDel = $rawDel | ConvertFrom-Json
                        if ($parsedDel) {
                            $isDel = ($parsedDel | Where-Object { $_.email -and $_.email.Trim().ToLower() -eq $checkEmail }) -ne $null
                        }
                    }
                } catch {}
            }
            $jsonStr = '{"isDeleted":' + ($isDel.ToString().ToLower()) + ',"email":"' + $checkEmail + '"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        if ($localPath -eq "/api/users" -and $request.HttpMethod -eq "GET") {
            # [SECURITY FIX VULN-01] Require admin auth; strip password fields from response
            $isLocalAdmin = ($request.IsLocal -or $clientIp -eq "127.0.0.1" -or $clientIp -eq "::1")
            if (-not (Test-AdminAuth $request) -and -not $isLocalAdmin) {
                $response.StatusCode = 401
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Xac thuc quan tri vien la bat buoc."}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }
            $userList = @()
            if (Test-Path $usersFilePath) {
                try {
                    $rawUsers = [System.IO.File]::ReadAllText($usersFilePath, [System.Text.Encoding]::UTF8)
                    if ($rawUsers) { $userList = @($rawUsers | ConvertFrom-Json) }
                } catch {}
            }
            if (-not $userList) { $userList = @() }
            # [SECURITY FIX VULN-01] Never expose password hashes to any client
            $safeList = @($userList | ForEach-Object { Remove-SensitiveFields $_ })
            $jsonStr = $safeList | ConvertTo-Json -Depth 10 -Compress
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        if ($localPath -eq "/api/users" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $bodyText = $reader.ReadToEnd()
            $newUser = if ($bodyText) { $bodyText | ConvertFrom-Json } else { $null }

            # Security: If not admin, enforce regular member role (prevent privilege escalation)
            $isAdminReq = (Test-AdminAuth $request) -or ($request.IsLocal -or $clientIp -eq "127.0.0.1" -or $clientIp -eq "::1")
            if (-not $isAdminReq) {
                if ($newUser -and ($newUser.role -eq "admin" -or $newUser.userType -eq "Admin")) {
                    $newUser.role = "user"
                    if ($newUser.userType -eq "Admin") { $newUser.userType = "Học sinh THCS" }
                }
            }

            if ($newUser -and $newUser.email) {
                $userList = @()
                if (Test-Path $usersFilePath) {
                    try {
                        $rawUsers = [System.IO.File]::ReadAllText($usersFilePath, [System.Text.Encoding]::UTF8)
                        if ($rawUsers) { $userList = @($rawUsers | ConvertFrom-Json) }
                    } catch {}
                }

                $cleanEmail = $newUser.email.ToString().Trim().ToLower()
                $updatedList = @()
                $found = $false
                foreach ($u in $userList) {
                    $uEmail = if ($u.email) { $u.email.ToString().Trim().ToLower() } else { "" }
                    $uId = if ($u.id) { $u.id.ToString().Trim() } else { "" }
                    if ($uEmail -eq $cleanEmail -or ($newUser.id -and $uId -eq $newUser.id.ToString().Trim())) {
                        $updatedList += $newUser
                        $found = $true
                    } else {
                        $updatedList += $u
                    }
                }
                if (-not $found) {
                    $updatedList += $newUser
                }

                $dataDir = Join-Path $PSScriptRoot "data"
                if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
                $savedJson = $updatedList | ConvertTo-Json -Depth 10
                [System.IO.File]::WriteAllText($usersFilePath, $savedJson, [System.Text.Encoding]::UTF8)

                # Clear from deleted_users.json if re-registered
                $delFilePath = Join-Path $dataDir "deleted_users.json"
                if (Test-Path $delFilePath) {
                    try {
                        $rawDel = [System.IO.File]::ReadAllText($delFilePath, [System.Text.Encoding]::UTF8)
                        if ($rawDel) {
                            $parsedDel = @($rawDel | ConvertFrom-Json)
                            $newDelList = @($parsedDel | Where-Object { $_.email -and $_.email.ToString().Trim().ToLower() -ne $cleanEmail -and $_.id -ne $newUser.id })
                            [System.IO.File]::WriteAllText($delFilePath, ($newDelList | ConvertTo-Json -Depth 5), [System.Text.Encoding]::UTF8)
                        }
                    } catch {}
                }

                $resObj = @{ ok = $true; user = $newUser }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json -Compress))
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 400
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Invalid user payload"}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.OutputStream.Close()
            continue
        }

        if ($localPath -eq "/api/users/delete" -and $request.HttpMethod -eq "POST") {
            # [SECURITY FIX VULN-02] Require admin auth
            $isLocalAdmin = ($request.IsLocal -or $clientIp -eq "127.0.0.1" -or $clientIp -eq "::1")
            if (-not (Test-AdminAuth $request) -and -not $isLocalAdmin) {
                $response.StatusCode = 401
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Xac thuc quan tri vien la bat buoc."}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $bodyText = $reader.ReadToEnd()
            $payload = if ($bodyText) { $bodyText | ConvertFrom-Json } else { $null }

            if ($payload -and ($payload.email -or $payload.id)) {
                $userList = @()
                if (Test-Path $usersFilePath) {
                    try {
                        $rawUsers = [System.IO.File]::ReadAllText($usersFilePath, [System.Text.Encoding]::UTF8)
                        if ($rawUsers) { $userList = @($rawUsers | ConvertFrom-Json) }
                    } catch {}
                }

                $delEmail = if ($payload.email) { $payload.email.ToString().Trim().ToLower() } else { "" }
                $delId = if ($payload.id) { $payload.id.ToString().Trim() } else { "" }

                $updatedList = @()
                foreach ($u in $userList) {
                    $uEmail = if ($u.email) { $u.email.ToString().Trim().ToLower() } else { "" }
                    $uId = if ($u.id) { $u.id.ToString().Trim() } else { "" }
                    if (($delEmail -and $uEmail -eq $delEmail) -or ($delId -and $uId -eq $delId)) {
                        continue
                    }
                    $updatedList += $u
                }

                $savedJson = $updatedList | ConvertTo-Json -Depth 10
                [System.IO.File]::WriteAllText($usersFilePath, $savedJson, [System.Text.Encoding]::UTF8)

                # Record in deleted_users.json
                $delFilePath = Join-Path (Join-Path $PSScriptRoot "data") "deleted_users.json"
                $delList = @()
                if (Test-Path $delFilePath) {
                    try {
                        $rawDel = [System.IO.File]::ReadAllText($delFilePath, [System.Text.Encoding]::UTF8)
                        if ($rawDel) { $delList = @($rawDel | ConvertFrom-Json) }
                    } catch {}
                }
                if ($delEmail -and -not ($delList | Where-Object { $_.email -and $_.email.ToString().Trim().ToLower() -eq $delEmail })) {
                    $delList += @{ email = $delEmail; id = $delId; deletedAt = (Get-Date).ToString("o") }
                    [System.IO.File]::WriteAllText($delFilePath, ($delList | ConvertTo-Json -Depth 5), [System.Text.Encoding]::UTF8)
                }

                $resObj = @{ ok = $true }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json -Compress))
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 400
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Invalid delete payload"}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.OutputStream.Close()
            continue
        }

        if ($localPath -eq "/api/users/update" -and $request.HttpMethod -eq "POST") {
            # [SECURITY FIX VULN-02] Require admin auth
            if (-not (Test-AdminAuth $request)) {
                $response.StatusCode = 401
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Xac thuc quan tri vien la bat buoc."}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $bodyText = $reader.ReadToEnd()
            $payload = if ($bodyText) { $bodyText | ConvertFrom-Json } else { $null }

            if ($payload -and ($payload.email -or $payload.id)) {
                $userList = @()
                if (Test-Path $usersFilePath) {
                    try {
                        $rawUsers = [System.IO.File]::ReadAllText($usersFilePath, [System.Text.Encoding]::UTF8)
                        if ($rawUsers) { $userList = @($rawUsers | ConvertFrom-Json) }
                    } catch {}
                }

                $matchEmail = if ($payload.email) { $payload.email.ToString().Trim().ToLower() } else { "" }
                $matchId = if ($payload.id) { $payload.id.ToString().Trim() } else { "" }

                $updatedList = @()
                $foundUser = $null
                foreach ($u in $userList) {
                    $uEmail = if ($u.email) { $u.email.ToString().Trim().ToLower() } else { "" }
                    $uId = if ($u.id) { $u.id.ToString().Trim() } else { "" }
                    if (($matchEmail -and $uEmail -eq $matchEmail) -or ($matchId -and $uId -eq $matchId)) {
                        foreach ($prop in $payload.PSObject.Properties) {
                            $u | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
                        }
                        $foundUser = $u
                    }
                    $updatedList += $u
                }

                $savedJson = $updatedList | ConvertTo-Json -Depth 10
                [System.IO.File]::WriteAllText($usersFilePath, $savedJson, [System.Text.Encoding]::UTF8)

                $resObj = @{ ok = $true; user = $foundUser }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json -Compress))
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 400
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Invalid update payload"}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.OutputStream.Close()
            continue
        }

        # --- API GATEWAY: Admin Token Exchange ---
        # [SECURITY FIX VULN-01] Require cryptographic verification of Firebase ID Token.
        # Never trust self-claimed email without Google OAuth2 signature verification.
        if ($localPath -eq "/api/admin-token" -and $request.HttpMethod -eq "POST") {
            $adminEmails = if ($envMap.ContainsKey("ADMIN_EMAILS")) { $envMap["ADMIN_EMAILS"].Split(",") | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ } } else { @() }
            if (-not $adminApiToken -or $adminEmails.Count -eq 0) {
                $response.StatusCode = 503
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Chuc nang quan tri chua duoc cau hinh tren may chu."}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $bodyText = $reader.ReadToEnd()
            $bodyObj = if ($bodyText) { $bodyText | ConvertFrom-Json } else { $null }
            $idToken = if ($bodyObj -and $bodyObj.idToken) { $bodyObj.idToken.ToString().Trim() } else { "" }

            if (-not $idToken) {
                $response.StatusCode = 401
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Yeu cau cung cap idToken xac thuc tu Firebase."}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }

            try {
                $verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=$idToken"
                $tokenInfo = Invoke-RestMethod -Uri $verifyUrl -Method Get -TimeoutSec 5
                $verifiedEmail = if ($tokenInfo -and $tokenInfo.email) { $tokenInfo.email.ToString().ToLower().Trim() } else { "" }
                $emailVerified = if ($tokenInfo -and ($tokenInfo.email_verified -eq $true -or $tokenInfo.email_verified -eq "true")) { $true } else { $false }
                $expectedAud = if ($envMap.ContainsKey("FIREBASE_PROJECT_ID")) { $envMap["FIREBASE_PROJECT_ID"] } else { "hshk-38bf1" }
                $audMatch = ($tokenInfo.aud -eq $expectedAud)

                if (-not $verifiedEmail -or -not $emailVerified -or -not $audMatch -or $adminEmails -notcontains $verifiedEmail) {
                    $response.StatusCode = 403
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Xac thuc danh tinh Admin that bai hoac email chua duoc xac minh."}')
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.OutputStream.Close()
                    continue
                }

                $tokenJson = (@{ token = $adminApiToken } | ConvertTo-Json -Compress)
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($tokenJson)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.OutputStream.Close()
                continue
            } catch {
                $response.StatusCode = 401
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Token Firebase khong hop le hoac da het han."}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }
        }

        # --- API GATEWAY: AI Chat Proxy ---
        if ($localPath -eq "/api/ai/chat" -and $request.HttpMethod -eq "POST") {
            if (-not (Test-RateLimit $clientIp)) {
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Yeu cau qua nhanh. Vui long thu lai sau 1 phut."}')
                $response.StatusCode = 429
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }

            $bodyStream = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $bodyText = $bodyStream.ReadToEnd()
            $bodyObj = if ($bodyText) { $bodyText | ConvertFrom-Json } else { @{} }

            if (-not $geminiApiKey) {
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"GEMINI_API_KEY chua duoc cau hinh tren may chu."}')
                $response.StatusCode = 500
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }

            try {
                $apiUrl = "$geminiUrl`?key=$geminiApiKey"
                $geminiPayload = @{
                    contents = if ($bodyObj.contents) { $bodyObj.contents } else { @(@{ parts = @(@{ text = $bodyObj.prompt }) }) }
                    generationConfig = @{
                        temperature = 0.35
                        maxOutputTokens = 1500
                    }
                }
                if ($bodyObj.systemInstruction) {
                    $geminiPayload["systemInstruction"] = @{ parts = @(@{ text = $bodyObj.systemInstruction }) }
                }

                $payloadJson = $geminiPayload | ConvertTo-Json -Depth 10
                $rawRes = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $payloadJson -ContentType "application/json; charset=utf-8"
                $outJson = $rawRes | ConvertTo-Json -Depth 10 -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $errMsg = $_.Exception.Message
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes(($(@{ error = $errMsg } | ConvertTo-Json -Compress)))
                $response.StatusCode = 500
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.OutputStream.Close()
            continue
        }

        # --- API GATEWAY: AI Translate Proxy ---
        if ($localPath -eq "/api/ai/translate" -and $request.HttpMethod -eq "POST") {
            if (-not (Test-RateLimit $clientIp)) {
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Yeu cau qua nhanh. Vui long thu lai sau 1 phut."}')
                $response.StatusCode = 429
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }

            $bodyStream = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $bodyText = $bodyStream.ReadToEnd()
            $bodyObj = if ($bodyText) { $bodyText | ConvertFrom-Json } else { @{} }

            $textToTranslate = $bodyObj.text
            $targetLang = $bodyObj.targetLang

            if (-not $textToTranslate -or -not $targetLang) {
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Thieu noi dung can dich hoac ngon ngu dich."}')
                $response.StatusCode = 400
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.OutputStream.Close()
                continue
            }

            try {
                $prompt = "Translate the following Geography study material text into language '$targetLang'. Return ONLY the direct translation accurately with standard educational geography terminology, without any notes or emojis:`n`n$textToTranslate"
                $geminiPayload = @{
                    contents = @(@{ parts = @(@{ text = $prompt }) })
                    generationConfig = @{ temperature = 0.2; maxOutputTokens = 1000 }
                }
                $apiUrl = "$geminiUrl`?key=$geminiApiKey"
                $payloadJson = $geminiPayload | ConvertTo-Json -Depth 5
                $rawRes = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $payloadJson -ContentType "application/json; charset=utf-8"
                $translated = $rawRes.candidates[0].content.parts[0].text
                $outJson = @{ translatedText = $translated; targetLang = $targetLang } | ConvertTo-Json -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($outJson)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $errMsg = $_.Exception.Message
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes(($(@{ error = $errMsg } | ConvertTo-Json -Compress)))
                $response.StatusCode = 500
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.OutputStream.Close()
            continue
        }

        # --- STATIC FILE SERVING ---
        if ($localPath -eq "/" -or [string]::IsNullOrWhiteSpace($localPath)) {
            $localPath = "/index.html"
        }

        # Security: Prevent Directory Traversal via Canonical Path Check
        $cleanRelPath = $localPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($PSScriptRoot, $cleanRelPath))
        $rootCanonical = [System.IO.Path]::GetFullPath($PSScriptRoot)

        # Block any traversal outside project directory
        if (-not $fullPath.StartsWith($rootCanonical, [System.StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        $filePath = $fullPath
        
        # Security: Block sensitive and hidden directories & files (.git, .vscode, .env, .rules, .ps1, package.json, server.js, etc.)
        $relNormalized = $cleanRelPath.ToLower()
        $pathParts = $relNormalized.Split([System.IO.Path]::DirectorySeparatorChar)
        $hasHiddenPart = ($pathParts | Where-Object { $_.StartsWith(".") -and $_ -ne "." -and $_ -ne ".." }) -ne $null
        $blockedDirs = @(".git", ".github", ".vscode", ".idea", "node_modules", "tests", "tools", "scratch", "tmp", "data")
        $hasBlockedDir = ($pathParts | Where-Object { $blockedDirs -contains $_ }) -ne $null

        $fileName = (Split-Path $filePath -Leaf).ToLower()
        $blockedExts = @(".rules", ".ps1", ".env", ".log", ".lock", ".sh", ".cmd", ".bat")
        $blockedNames = @("package.json", "package-lock.json", "server.js", "server.ps1", ".env", ".env.example", ".gitignore", "project_structure.md")
        $isBlocked = $hasHiddenPart -or $hasBlockedDir -or 
                     ($blockedExts | Where-Object { $fileName.EndsWith($_) }) -or 
                     ($blockedNames -contains $fileName)

        if ($isBlocked) {
            $response.StatusCode = 403
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
            continue
        }

        if (Test-Path $filePath) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            if ($filePath.EndsWith(".html")) {
                $response.ContentType = "text/html; charset=utf-8"
            } elseif ($filePath.EndsWith(".css")) {
                $response.ContentType = "text/css; charset=utf-8"
            } elseif ($filePath.EndsWith(".js")) {
                $response.ContentType = "application/javascript; charset=utf-8"
            } elseif ($filePath.EndsWith(".png")) {
                $response.ContentType = "image/png"
            } elseif ($filePath.EndsWith(".jpg") -or $filePath.EndsWith(".jpeg")) {
                $response.ContentType = "image/jpeg"
            } elseif ($filePath.EndsWith(".svg")) {
                $response.ContentType = "image/svg+xml"
            } elseif ($filePath.EndsWith(".webp")) {
                $response.ContentType = "image/webp"
            } elseif ($filePath.EndsWith(".ico")) {
                $response.ContentType = "image/x-icon"
            } elseif ($filePath.EndsWith(".json")) {
                $response.ContentType = "application/json; charset=utf-8"
            } elseif ($filePath.EndsWith(".pdf")) {
                $response.ContentType = "application/pdf"
            }
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.AddHeader("Pragma", "no-cache")
            $response.AddHeader("Expires", "0")
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.OutputStream.Close()
    } catch {
        # continue loop
    }
}
