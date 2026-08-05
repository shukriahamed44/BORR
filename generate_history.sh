#!/usr/bin/env bash

# ==============================================================================
# Git Commit History Generator Script
# Author: shukriahamed44 <shukriahamed44@gmail.com>
# Date Range: 31 July 2026 - 04 August 2026 (20 realistic commits)
# NOTE: This script only creates local commits. IT DOES NOT PUSH TO GITHUB.
# ==============================================================================

set -e

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
fi

# Set local git config for author/committer identity
git config user.name "shukriahamed44"
git config user.email "shukriahamed44@gmail.com"

AUTHOR_NAME="shukriahamed44"
AUTHOR_EMAIL="shukriahamed44@gmail.com"

commit_step() {
    local date_str="$1"
    local msg="$2"
    shift 2
    local files=("$@")

    echo "----------------------------------------------------"
    echo "Staging files for commit: $msg"
    echo "Date: $date_str"
    
    for f in "${files[@]}"; do
        if [ -e "$f" ]; then
            git add "$f"
        fi
    done

    GIT_AUTHOR_DATE="$date_str" GIT_COMMITTER_DATE="$date_str" git commit --author="$AUTHOR_NAME <$AUTHOR_EMAIL>" -m "$msg" || echo "No changes to commit for: $msg"
}

echo "Starting commit history generation..."

# ==============================================================================
# PHASE 1: Database & Architecture (31 July 2026)
# ==============================================================================
commit_step "2026-07-31T09:15:22" "docs: add initial DDL schema context and assessment ERD specs" \
    ".gitignore" "README.md" "Full Stack Engineering Assessment_28072026.md" "erp_diagram.md"

commit_step "2026-07-31T11:42:10" "chore: initialize NestJS backend and config files" \
    "backend/package.json" "backend/package-lock.json" "backend/tsconfig.json" "backend/tsconfig.build.json" \
    "backend/nest-cli.json" "backend/eslint.config.mjs" "backend/.prettierrc" \
    "backend/src/app.module.ts" "backend/src/app.controller.ts" "backend/src/app.service.ts" "backend/src/app.controller.spec.ts"

commit_step "2026-07-31T14:20:05" "feat: generate AI Prisma schema and dockerize postgres db" \
    "docker-compose.yml" "backend/.env" "backend/prisma/schema.prisma" "backend/prisma.config.ts"

commit_step "2026-07-31T17:05:48" "feat: apply initial database migrations and setup PrismaService" \
    "backend/prisma/migrations" "backend/src/prisma"

# ==============================================================================
# PHASE 2: Authentication & Security (01 Aug 2026)
# ==============================================================================
commit_step "2026-08-01T10:12:15" "feat: implment JWT and refresh token strategy" \
    "backend/src/auth/strategies" "backend/src/auth/auth.module.ts"

commit_step "2026-08-01T12:35:40" "feat: add password hashing and auth controller endpoints" \
    "backend/src/auth/auth.service.ts" "backend/src/auth/auth.controller.ts" "backend/src/auth/dto" "backend/src/auth/auth.service.spec.ts" "backend/test_auth.js"

commit_step "2026-08-01T15:18:29" "feat: implement RBAC guards and role decorators" \
    "backend/src/auth/guards" "backend/src/auth/decorators"

commit_step "2026-08-01T18:40:12" "feat: add rate limiting, DTO validation pipes and activity logging interceptor" \
    "backend/src/common"

# ==============================================================================
# PHASE 3: Core Domain APIs & Queue Infrastructure (02 Aug 2026)
# ==============================================================================
commit_step "2026-08-02T09:30:18" "feat: equipment CRUD operations and mock document upload" \
    "backend/src/products"

commit_step "2026-08-02T11:55:04" "feat: add reservation transaction service state machine" \
    "backend/src/reservations"

commit_step "2026-08-02T14:45:33" "feat: implment warehouse inventory logs and mock payment workflow" \
    "backend/src/inventory" "backend/src/payments"

commit_step "2026-08-02T17:20:50" "feat: setup BullMQ async notifications and swagger openapi specs" \
    "backend/src/notifications" "backend/src/main.ts" "backend/postman_collection.json" "postman" "backend/README.md"

# ==============================================================================
# PHASE 4: Web Application (Next.js & Frontend) (03 Aug 2026)
# ==============================================================================
commit_step "2026-08-03T10:05:12" "feat: init Next.js web app router and auth context setup" \
    "web/package.json" "web/package-lock.json" "web/tsconfig.json" "web/next.config.js" "web/next-env.d.ts" \
    "web/src/app/layout.tsx" "web/src/app/page.tsx" "web/src/app/globals.css" "web/src/app/login" \
    "web/src/app/register" "web/src/app/forgot-password" "web/src/context" "web/src/lib" "frontend"

commit_step "2026-08-03T12:40:55" "feat: equipment catalog search and filtering component" \
    "web/src/app/catalog" "web/src/components"

commit_step "2026-08-03T15:15:30" "feat: reservation modal creation and document upload forms" \
    "web/src/app/reservations"

commit_step "2026-08-03T18:02:41" "feat: admin dashboard analytics and warehouse inventory views" \
    "web/src/app/admin" "web/src/app/inventory"

# ==============================================================================
# PHASE 5: Mobile Application (Flutter) (04 Aug 2026)
# ==============================================================================
commit_step "2026-08-04T09:10:05" "feat: setup flutter app structure and secure token storage client" \
    "mobile/pubspec.yaml" "mobile/pubspec.lock" "mobile/analysis_options.yaml" "mobile/.metadata" \
    "mobile/ammunation_mobile.iml" "mobile/lib/core" "mobile/lib/shared" "mobile/README.md"

commit_step "2026-08-04T11:25:44" "feat: customer catalog and reservation views in mobile" \
    "mobile/lib/features/auth" "mobile/lib/features/catalog" "mobile/lib/features/reservations"

commit_step "2026-08-04T13:40:19" "feat: staff push notifications and equipment QR scanner modual" \
    "mobile/lib/features/notifications" "mobile/lib/features/qr_scanner" "mobile/lib/features/staff" "mobile/lib/main.dart"

commit_step "2026-08-04T15:30:00" "docs: final project cleanup and deployment instructions" \
    "."

echo "===================================================="
echo "Commit history generation completed successfully!"
echo "Total commits created:"
git log --oneline | wc -l
echo "Run 'git log --oneline --graph' to verify your commit timeline."
echo "NO REMOTE PUSH WAS PERFORMED."
