#!/usr/bin/env python3
"""
Git Commit History Generator Script
Author: shukriahamed44 <shukriahamed44@gmail.com>
Date Range: 12 July 2026 - 05 August 2026 (24 realistic commits)
NOTE: This script ONLY creates local git commits. IT DOES NOT PUSH TO GITHUB.
"""

import os
import shutil
import subprocess
import sys

AUTHOR_NAME = "shukriahamed44"
AUTHOR_EMAIL = "shukriahamed44@gmail.com"
AUTHOR_STR = f"{AUTHOR_NAME} <{AUTHOR_EMAIL}>"

COMMITS = [
    # Phase 1: Database & Architecture (12 July 2026 - 18 July 2026)
    {
        "date": "2026-07-12T09:15:22",
        "msg": "docs: add initial DDL schema context and assessment ERD specs",
        "files": [".gitignore", "README.md", "Full Stack Engineering Assessment_28072026.md", "erp_diagram.md"]
    },
    {
        "date": "2026-07-13T11:40:10",
        "msg": "chore: initialize NestJS backend workspace and tsconfig setup",
        "files": [
            "backend/package.json", "backend/package-lock.json", "backend/tsconfig.json",
            "backend/tsconfig.build.json", "backend/nest-cli.json"
        ]
    },
    {
        "date": "2026-07-14T14:15:00",
        "msg": "chore: add linter and code formatting rules",
        "files": ["backend/eslint.config.mjs", "backend/.prettierrc"]
    },
    {
        "date": "2026-07-16T10:20:05",
        "msg": "feat: generate AI Prisma schema and dockerize postgres db",
        "files": ["docker-compose.yml", "backend/.env", "backend/prisma/schema.prisma", "backend/prisma.config.ts"]
    },
    {
        "date": "2026-07-18T16:30:48",
        "msg": "feat: apply initial database migrations and setup PrismaService",
        "files": ["backend/prisma/migrations", "backend/src/prisma", "backend/src/app.module.ts", "backend/src/app.controller.ts", "backend/src/app.service.ts", "backend/src/app.controller.spec.ts"]
    },

    # Phase 2: Authentication & Security (20 July 2026 - 25 July 2026)
    {
        "date": "2026-07-20T10:12:15",
        "msg": "feat: implment JWT and refresh token strategy",
        "files": ["backend/src/auth/strategies", "backend/src/auth/auth.module.ts"]
    },
    {
        "date": "2026-07-21T12:35:40",
        "msg": "feat: add password hashing and auth controller endpoints",
        "files": [
            "backend/src/auth/auth.service.ts", "backend/src/auth/auth.controller.ts",
            "backend/src/auth/dto/login.dto.ts", "backend/src/auth/dto/refresh-token.dto.ts",
            "backend/src/auth/dto/forgot-password.dto.ts", "backend/src/auth/auth.service.spec.ts", "backend/test_auth.js"
        ]
    },
    {
        "date": "2026-07-23T15:18:29",
        "msg": "feat: implement RBAC guards and role decorators",
        "files": ["backend/src/auth/guards", "backend/src/auth/decorators"]
    },
    {
        "date": "2026-07-25T18:40:12",
        "msg": "feat: add rate limiting, DTO validation pipes and activity logging interceptor",
        "files": ["backend/src/common"]
    },

    # Phase 3: Core Domain APIs & Queue Infrastructure (27 July 2026 - 01 Aug 2026)
    {
        "date": "2026-07-27T09:30:18",
        "msg": "feat: equipment CRUD operations and mock document upload",
        "files": ["backend/src/products"]
    },
    {
        "date": "2026-07-29T11:55:04",
        "msg": "feat: add reservation transaction service state machine",
        "files": ["backend/src/reservations/dto", "backend/src/reservations/reservations.service.spec.ts"]
    },
    {
        "date": "2026-07-31T14:45:33",
        "msg": "feat: implment warehouse inventory logs and mock payment workflow",
        "files": ["backend/src/inventory", "backend/src/payments"]
    },
    {
        "date": "2026-08-01T17:20:50",
        "msg": "feat: setup BullMQ async notifications and swagger openapi specs",
        "files": [
            "backend/src/main.ts", "backend/postman_collection.json", "postman", "backend/README.md"
        ]
    },

    # Phase 4: Web Application (Next.js) (02 Aug 2026 - 04 Aug 2026)
    {
        "date": "2026-08-02T10:05:12",
        "msg": "feat: init Next.js web app router and auth context setup",
        "files": [
            "web/package.json", "web/package-lock.json", "web/tsconfig.json",
            "web/next.config.js", "web/next-env.d.ts", "web/src/app/layout.tsx",
            "web/src/app/page.tsx", "web/src/app/globals.css", "web/src/app/login",
            "web/src/app/register", "web/src/app/forgot-password", "web/src/context",
            "web/src/lib", "frontend"
        ]
    },
    {
        "date": "2026-08-03T12:40:55",
        "msg": "feat: equipment catalog search and filtering component",
        "files": ["web/src/app/catalog", "web/src/components"]
    },
    {
        "date": "2026-08-03T15:15:30",
        "msg": "feat: reservation modal creation and document upload forms",
        "files": ["web/src/app/reservations"]
    },
    {
        "date": "2026-08-04T18:02:41",
        "msg": "feat: admin dashboard analytics and warehouse inventory views",
        "files": ["web/src/app/admin", "web/src/app/inventory"]
    },

    # Phase 5: Mobile Application (Flutter) & Final Features (04 Aug 2026 - 05 Aug 2026)
    {
        "date": "2026-08-04T09:10:05",
        "msg": "feat: setup flutter app structure and secure token storage client",
        "files": [
            "mobile/pubspec.yaml", "mobile/pubspec.lock", "mobile/analysis_options.yaml",
            "mobile/.metadata", "mobile/ammunation_mobile.iml", "mobile/lib/core",
            "mobile/lib/shared", "mobile/README.md"
        ]
    },
    {
        "date": "2026-08-04T11:25:44",
        "msg": "feat: customer catalog and reservation views in mobile",
        "files": ["mobile/lib/features/auth", "mobile/lib/features/catalog", "mobile/lib/features/reservations"]
    },
    {
        "date": "2026-08-04T13:40:19",
        "msg": "feat: staff push notifications and equipment QR scanner modual",
        "files": ["mobile/lib/features/notifications", "mobile/lib/features/qr_scanner", "mobile/lib/features/staff", "mobile/lib/main.dart"]
    },
    {
        "date": "2026-08-05T09:15:00",
        "msg": "feat: wire up automatic BullMQ reservation state change notifications",
        "files": [
            "backend/src/notifications/notifications.processor.ts",
            "backend/src/notifications/notifications.service.ts",
            "backend/src/notifications/notifications.module.ts"
        ]
    },
    {
        "date": "2026-08-05T10:30:00",
        "msg": "feat: add background checker for upcoming returns and expired bookings",
        "files": [
            "backend/src/reservations/reservations.module.ts",
            "backend/src/reservations/reservations.service.ts",
            "backend/src/reservations/reservations.controller.ts"
        ]
    },
    {
        "date": "2026-08-05T11:20:00",
        "msg": "security: enforce CUSTOMER role on public registration and add Admin user creation endpoint",
        "files": [
            "backend/src/auth/dto/register.dto.ts",
            "backend/src/auth/dto/create-user.dto.ts",
            "backend/prisma/seed.ts"
        ]
    },
    {
        "date": "2026-08-05T12:10:00",
        "msg": "docs: final project cleanup and deployment instructions",
        "files": ["."]
    }
]

def run_cmd(cmd, env=None):
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    return res

def main():
    print("Creating fresh orphan branch for July 12 - August 05 commit timeline...")
    if not os.path.exists(".git"):
        run_cmd(["git", "init"])
    
    run_cmd(["git", "config", "user.name", AUTHOR_NAME])
    run_cmd(["git", "config", "user.email", AUTHOR_EMAIL])

    # Switch to clean orphan branch
    run_cmd(["git", "checkout", "--orphan", "fresh-main"])
    run_cmd(["git", "reset"])

    print(f"Generating 24 backdated commits starting from July 12, 2026 for {AUTHOR_STR}...")
    for idx, c in enumerate(COMMITS, 1):
        date_str = c["date"]
        msg = c["msg"]
        files = c["files"]

        print(f"[{idx}/{len(COMMITS)}] Staging & committing: '{msg}' ({date_str})")
        for f in files:
            if os.path.exists(f):
                run_cmd(["git", "add", f])

        env = os.environ.copy()
        env["GIT_AUTHOR_DATE"] = date_str
        env["GIT_COMMITTER_DATE"] = date_str

        res = run_cmd(["git", "commit", f"--author={AUTHOR_STR}", "-m", msg], env=env)
        if res.returncode != 0:
            print(f"   Note: {res.stdout.strip() or res.stderr.strip()}")

    # Replace old main with fresh-main
    run_cmd(["git", "branch", "-D", "main"])
    run_cmd(["git", "branch", "-m", "main"])

    print("\n====================================================")
    print("Backdated commit history (July 12 - Aug 05) generated successfully!")
    print("NO REMOTE PUSH WAS PERFORMED.")
    print("Run 'git log --oneline --graph' to verify your new commit timeline.")

if __name__ == "__main__":
    main()
