# Postgres + Redis on Windows, no Docker, no admin, no services.
#
#   .\scripts\devstack.ps1 up       # download (first run only), init, start both
#   .\scripts\devstack.ps1 down     # stop both
#   .\scripts\devstack.ps1 status   # ports + versions
#
# Why: Docker lives inside WSL, and this machine's WSL has no vEthernet adapter,
# so Windows cannot reach the containers at all (Prisma P1001). Portable builds
# on the Windows side remove the network hop entirely. See MASTER BOOTUP GUIDE.md.
#
# Everything lands in $Root below - nothing is installed, delete the folder to undo.
# ASCII only. Windows PowerShell 5.1 reads this file as ANSI.

param([Parameter(Position = 0)][ValidateSet('up', 'down', 'status')][string]$Target = 'status')

$ErrorActionPreference = 'Stop'

$Root    = 'E:\Apps\devstack'
$PgDir   = "$Root\pgsql"
$PgData  = "$Root\pgdata"
$PgLog   = "$Root\postgres.log"
$RedisDir = "$Root\redis"
$RedisLog = "$Root\redis.log"
$Db      = 'ammunation_db'

$PgUrl    = 'https://get.enterprisedb.com/postgresql/postgresql-16.10-1-windows-x64-binaries.zip'
$RedisUrl = 'https://github.com/redis-windows/redis-windows/releases/download/8.10.0/Redis-8.10.0-Windows-x64-msys2.zip'

function Test-Port($port) {
    $c = New-Object System.Net.Sockets.TcpClient
    try { $c.Connect('127.0.0.1', $port); $c.Close(); $true } catch { $false }
}

function Get-Zip($url, $dest, $name) {
    $zip = "$Root\$name.zip"
    if (-not (Test-Path $zip)) {
        Write-Host "downloading $name ..." -ForegroundColor Cyan
        $old = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest $url -OutFile $zip -UseBasicParsing
        $ProgressPreference = $old
    }
    Write-Host "extracting $name ..." -ForegroundColor Cyan
    $tmp = "$Root\_x_$name"
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive $zip -DestinationPath $tmp -Force
    # Zips wrap their payload in one top folder; hoist it so paths stay predictable.
    $inner = Get-ChildItem $tmp
    if ($inner.Count -eq 1 -and $inner[0].PSIsContainer) { Move-Item $inner[0].FullName $dest } else { Move-Item $tmp $dest }
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
}

function Find-Exe($dir, $name) {
    $hit = Get-ChildItem $dir -Recurse -Filter $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $hit) { throw "$name not found under $dir" }
    return $hit.FullName
}

switch ($Target) {
    'up' {
        if (-not (Test-Path $Root)) { New-Item -ItemType Directory $Root | Out-Null }
        if (-not (Test-Path $PgDir))    { Get-Zip $PgUrl    $PgDir    'postgres' }
        if (-not (Test-Path $RedisDir)) { Get-Zip $RedisUrl $RedisDir 'redis' }

        # --- postgres ---
        if (-not (Test-Path $PgData)) {
            Write-Host 'initdb (first run) ...' -ForegroundColor Cyan
            # trust auth: loopback-only dev cluster, no password to leak into .env
            & "$PgDir\bin\initdb.exe" -D $PgData -U postgres --auth=trust -E UTF8 | Out-Null
        }
        if (Test-Port 5432) {
            Write-Host 'postgres already up' -ForegroundColor DarkGray
        } else {
            & "$PgDir\bin\pg_ctl.exe" -D $PgData -l $PgLog -o '-p 5432' -w start
        }
        $exists = & "$PgDir\bin\psql.exe" -U postgres -h 127.0.0.1 -tAc "SELECT 1 FROM pg_database WHERE datname='$Db'"
        if (-not $exists) {
            & "$PgDir\bin\createdb.exe" -U postgres -h 127.0.0.1 $Db
            Write-Host "created database $Db" -ForegroundColor Green
        }

        # --- redis ---
        if (Test-Port 6379) {
            Write-Host 'redis already up' -ForegroundColor DarkGray
        } else {
            $redis = Find-Exe $RedisDir 'redis-server.exe'
            Start-Process $redis -ArgumentList '--port 6379' -WorkingDirectory (Split-Path $redis) `
                -WindowStyle Hidden -RedirectStandardOutput $RedisLog -RedirectStandardError "$RedisLog.err"
        }

        Write-Host ''
        Write-Host 'postgres 127.0.0.1:5432   redis 127.0.0.1:6379' -ForegroundColor Green
    }

    'down' {
        if (Test-Path $PgData) { & "$PgDir\bin\pg_ctl.exe" -D $PgData -m fast stop }
        Get-Process redis-server -ErrorAction SilentlyContinue | Stop-Process -Force
        Write-Host 'stopped' -ForegroundColor Yellow
    }

    'status' {
        Write-Output ('postgres 127.0.0.1:5432 : ' + (Test-Port 5432))
        Write-Output ('redis    127.0.0.1:6379 : ' + (Test-Port 6379))
        Get-Process postgres, redis-server -ErrorAction SilentlyContinue |
            Select-Object Name, Id, StartTime | Format-Table -AutoSize
    }
}
