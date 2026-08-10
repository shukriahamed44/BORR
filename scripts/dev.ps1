# Local dev launcher for Windows + WSL.
#
#   .\scripts\dev.ps1 data       # start Postgres + Redis containers in WSL
#   .\scripts\dev.ps1 backend    # NestJS on :3000, watch mode
#   .\scripts\dev.ps1 web        # Vite on :5173
#   .\scripts\dev.ps1 status     # what is running, and where
#
# Why this exists: Postgres and Redis run in Docker *inside WSL*, and this
# machine's WSL is stuck on NAT networking (mirrored mode needs a newer Windows
# build), where the 127.0.0.1 port relay dies seconds after a container starts.
# So the backend gets the WSL VM's address instead, which changes on every WSL
# boot: hence resolving it at launch rather than pinning it in .env.
#
# ASCII only. Windows PowerShell 5.1 reads this file as ANSI and a stray
# non-ASCII character turns the whole script into parse errors.

param([Parameter(Position = 0)][ValidateSet('backend', 'web', 'data', 'status')][string]$Target = 'status')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Get-WslIp {
    $ip = ((wsl.exe -e hostname -I) -split '\s+' | Where-Object { $_ -match '^\d+\.' } | Select-Object -First 1)
    if (-not $ip) { throw 'Could not read the WSL IP. Is WSL running? Try: wsl -e true' }
    return $ip.Trim()
}

function Test-Port($computer, $port) {
    $c = New-Object System.Net.Sockets.TcpClient
    try { $c.Connect($computer, $port); $c.Close(); $true } catch { $false }
}

switch ($Target) {
    'data' {
        wsl.exe -e sh -c 'docker start ammunation_postgres ammunation_redis >/dev/null 2>&1; docker ps --format "{{.Names}}  {{.Status}}"'
        $ip = Get-WslIp
        Write-Host "Postgres/Redis reachable from Windows at $ip" -ForegroundColor Green
    }

    'backend' {
        $ip = Get-WslIp
        if (-not (Test-Port $ip 5432)) {
            throw "No Postgres at ${ip}:5432. Start it first with: .\scripts\dev.ps1 data"
        }
        # Shell values win over backend/.env: dotenv never overwrites an existing variable.
        $env:DATABASE_URL = "postgresql://postgres:postgres@${ip}:5432/ammunation_db?schema=public"
        $env:REDIS_URL = "redis://${ip}:6379"
        Write-Host "DB -> $ip" -ForegroundColor Green
        Set-Location "$root\backend"
        npm run start:dev
    }

    'web' {
        Set-Location "$root\frontend"
        npm run dev
    }

    'status' {
        Write-Output ''
        Write-Output '--- ports (windows side) ---'
        Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
            Where-Object { $_.LocalPort -in 3000, 5173, 5432, 6379 } |
            Sort-Object LocalPort |
            ForEach-Object {
                $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" -ErrorAction SilentlyContinue
                '{0,-6} {1,-10} pid={2,-7} {3}' -f $_.LocalPort, $_.LocalAddress, $_.OwningProcess, $p.Name
            }

        Write-Output ''
        Write-Output '--- containers (inside wsl) ---'
        wsl.exe -e sh -c 'docker ps --format "{{.Names}}  {{.Image}}  {{.Status}}" 2>/dev/null'

        Write-Output ''
        Write-Output '--- reachability ---'
        $ip = try { Get-WslIp } catch { $null }
        if ($ip) {
            Write-Output ('wsl ip            : ' + $ip)
            Write-Output ('postgres ' + $ip + ':5432 : ' + (Test-Port $ip 5432))
            Write-Output ('redis    ' + $ip + ':6379 : ' + (Test-Port $ip 6379))
        }
        Write-Output ('api  127.0.0.1:3000 : ' + (Test-Port '127.0.0.1' 3000))
        Write-Output ('web  127.0.0.1:5173 : ' + (Test-Port '127.0.0.1' 5173))
    }
}
