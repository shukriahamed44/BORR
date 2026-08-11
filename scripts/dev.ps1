# Local dev launcher for Windows + WSL.
#
#   .\scripts\dev.ps1 data       # start Postgres + Redis containers in WSL
#   .\scripts\dev.ps1 backend    # NestJS on :3000, watch mode
#   .\scripts\dev.ps1 web        # Vite on :5173
#   .\scripts\dev.ps1 status     # what is running, and where
#
# Everything runs on Windows now. Postgres and Redis used to live in Docker
# inside WSL, but this machine has no vEthernet (WSL) adapter, so Windows could
# not reach them at all - Prisma died with P1001 within a minute of every boot.
# 'data' now starts portable Windows builds instead: see devstack.ps1.
#
# ASCII only. Windows PowerShell 5.1 reads this file as ANSI and a stray
# non-ASCII character turns the whole script into parse errors.

param([Parameter(Position = 0)][ValidateSet('backend', 'web', 'data', 'status')][string]$Target = 'status')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Test-Port($computer, $port) {
    # Constructor form, not New-Object + .Connect(): the parameterless TcpClient is
    # IPv4-only on PowerShell 5.1, and Vite listens on ::1.
    try { $c = New-Object System.Net.Sockets.TcpClient($computer, $port); $c.Close(); $true } catch { $false }
}

switch ($Target) {
    'data' {
        & "$PSScriptRoot\devstack.ps1" up
    }

    'backend' {
        if (-not (Test-Port '127.0.0.1' 5432)) {
            throw 'No Postgres at 127.0.0.1:5432. Start it first with: .\scripts\dev.ps1 data'
        }
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
        Write-Output '--- reachability ---'
        Write-Output ('postgres 127.0.0.1:5432 : ' + (Test-Port '127.0.0.1' 5432))
        Write-Output ('redis    127.0.0.1:6379 : ' + (Test-Port '127.0.0.1' 6379))
        Write-Output ('api  127.0.0.1:3000 : ' + (Test-Port '127.0.0.1' 3000))
        # ::1, not 127.0.0.1: Vite binds IPv6 loopback only, and 'localhost' resolves to v4 first.
        Write-Output ('web  [::1]:5173     : ' + (Test-Port '::1' 5173))
    }
}
