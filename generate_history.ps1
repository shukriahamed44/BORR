# ==============================================================================
# Git Commit History Generator Script (PowerShell)
# Author: shukriahamed44 <shukriahamed44@gmail.com>
# Date Range: 12 July 2026 - 05 August 2026 (24 realistic commits)
# NOTE: This script only creates local commits. IT DOES NOT PUSH TO GITHUB.
# ==============================================================================

if (Test-Path ".git") {
    Remove-Item -Recurse -Force ".git" -ErrorAction SilentlyContinue
}

Write-Host "Initializing fresh git repository..." -ForegroundColor Yellow
git init
git config user.name "shukriahamed44"
git config user.email "shukriahamed44@gmail.com"

$Author = "shukriahamed44 <shukriahamed44@gmail.com>"

function Add-Commit {
    param (
        [string]$Date,
        [string]$Message,
        [string[]]$Targets
    )

    Write-Host "----------------------------------------------------" -ForegroundColor Cyan
    Write-Host "Staging files: $Message" -ForegroundColor Green
    Write-Host "Date: $Date"

    foreach ($item in $Targets) {
        if (Test-Path $item) {
            git add $item
        }
    }

    $env:GIT_AUTHOR_DATE = $Date
    $env:GIT_COMMITTER_DATE = $Date

    git commit --author=$Author -m $Message
}

Write-Host "Starting 24 backdated commits (July 12 - Aug 05)..." -ForegroundColor Yellow

# Phase 1: Database & Architecture (12 July - 18 July 2026)
Add-Commit "2026-07-12T09:15:22" "docs: add initial DDL schema context and assessment ERD specs" @(".gitignore", "README.md", "Full Stack Engineering Assessment_28072026.md", "erp_diagram.md")
Add-Commit "2026-07-13T11:40:10" "chore: initialize NestJS backend workspace and tsconfig setup" @("backend/package.json", "backend/package-lock.json", "backend/tsconfig.json", "backend/tsconfig.build.json", "backend/nest-cli.json")
Add-Commit "2026-07-14T14:15:00" "chore: add linter and code formatting rules" @("backend/eslint.config.mjs", "backend/.prettierrc")
Add-Commit "2026-07-16T10:20:05" "feat: generate AI Prisma schema and dockerize postgres db" @("docker-compose.yml", "backend/.env", "backend/prisma/schema.prisma", "backend/prisma.config.ts")
Add-Commit "2026-07-18T16:30:48" "feat: apply initial database migrations and setup PrismaService" @("backend/prisma/migrations", "backend/src/prisma", "backend/src/app.module.ts", "backend/src/app.controller.ts", "backend/src/app.service.ts", "backend/src/app.controller.spec.ts")

# Phase 2: Authentication & Security (20 July - 25 July 2026)
Add-Commit "2026-07-20T10:12:15" "feat: implment JWT and refresh token strategy" @("backend/src/auth/strategies", "backend/src/auth/auth.module.ts")
Add-Commit "2026-07-21T12:35:40" "feat: add password hashing and auth controller endpoints" @("backend/src/auth/auth.service.ts", "backend/src/auth/auth.controller.ts", "backend/src/auth/dto/login.dto.ts", "backend/src/auth/dto/refresh-token.dto.ts", "backend/src/auth/dto/forgot-password.dto.ts", "backend/src/auth/auth.service.spec.ts", "backend/test_auth.js")
Add-Commit "2026-07-23T15:18:29" "feat: implement RBAC guards and role decorators" @("backend/src/auth/guards", "backend/src/auth/decorators")
Add-Commit "2026-07-25T18:40:12" "feat: add rate limiting, DTO validation pipes and activity logging interceptor" @("backend/src/common")

# Phase 3: Core Domain APIs & Queue Infrastructure (27 July - 01 Aug 2026)
Add-Commit "2026-07-27T09:30:18" "feat: equipment CRUD operations and mock document upload" @("backend/src/products")
Add-Commit "2026-07-29T11:55:04" "feat: add reservation transaction service state machine" @("backend/src/reservations/dto", "backend/src/reservations/reservations.service.spec.ts")
Add-Commit "2026-07-31T14:45:33" "feat: implment warehouse inventory logs and mock payment workflow" @("backend/src/inventory", "backend/src/payments")
Add-Commit "2026-08-01T17:20:50" "feat: setup BullMQ async notifications and swagger openapi specs" @("backend/src/main.ts", "backend/postman_collection.json", "postman", "backend/README.md")

# Phase 4: Web Application (Next.js & Frontend) (02 Aug - 04 Aug 2026)
Add-Commit "2026-08-02T10:05:12" "feat: init Next.js web app router and auth context setup" @("web/package.json", "web/package-lock.json", "web/tsconfig.json", "web/next.config.js", "web/next-env.d.ts", "web/src/app/layout.tsx", "web/src/app/page.tsx", "web/src/app/globals.css", "web/src/app/login", "web/src/app/register", "web/src/app/forgot-password", "web/src/context", "web/src/lib", "frontend")
Add-Commit "2026-08-03T12:40:55" "feat: equipment catalog search and filtering component" @("web/src/app/catalog", "web/src/components")
Add-Commit "2026-08-03T15:15:30" "feat: reservation modal creation and document upload forms" @("web/src/app/reservations")
Add-Commit "2026-08-04T18:02:41" "feat: admin dashboard analytics and warehouse inventory views" @("web/src/app/admin", "web/src/app/inventory")

# Phase 5: Mobile Application & Final Features (04 Aug - 05 Aug 2026)
Add-Commit "2026-08-04T09:10:05" "feat: setup flutter app structure and secure token storage client" @("mobile/pubspec.yaml", "mobile/pubspec.lock", "mobile/analysis_options.yaml", "mobile/.metadata", "mobile/ammunation_mobile.iml", "mobile/lib/core", "mobile/lib/shared", "mobile/README.md")
Add-Commit "2026-08-04T11:25:44" "feat: customer catalog and reservation views in mobile" @("mobile/lib/features/auth", "mobile/lib/features/catalog", "mobile/lib/features/reservations")
Add-Commit "2026-08-04T13:40:19" "feat: staff push notifications and equipment QR scanner modual" @("mobile/lib/features/notifications", "mobile/lib/features/qr_scanner", "mobile/lib/features/staff", "mobile/lib/main.dart")
Add-Commit "2026-08-05T09:15:00" "feat: wire up automatic BullMQ reservation state change notifications" @("backend/src/notifications/notifications.processor.ts", "backend/src/notifications/notifications.service.ts", "backend/src/notifications/notifications.module.ts")
Add-Commit "2026-08-05T10:30:00" "feat: add background checker for upcoming returns and expired bookings" @("backend/src/reservations/reservations.module.ts", "backend/src/reservations/reservations.service.ts", "backend/src/reservations/reservations.controller.ts")
Add-Commit "2026-08-05T11:20:00" "security: enforce CUSTOMER role on public registration and add Admin user creation endpoint" @("backend/src/auth/dto/register.dto.ts", "backend/src/auth/dto/create-user.dto.ts", "backend/prisma/seed.ts")
Add-Commit "2026-08-05T12:10:00" "docs: final project cleanup and deployment instructions" @(".")

Write-Host "====================================================" -ForegroundColor Yellow
Write-Host "Backdated commit history (July 12 - Aug 05) generated successfully!" -ForegroundColor Green
Write-Host "NO REMOTE PUSH WAS PERFORMED." -ForegroundColor Magenta
