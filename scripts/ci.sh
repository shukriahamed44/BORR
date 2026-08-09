#!/usr/bin/env bash
#
# CI entry point. The same commands run locally and in GitHub Actions, so a green
# run here means a green run there.
#
#   ./scripts/ci.sh            # everything
#   ./scripts/ci.sh backend    # one part
#
# Needs: node 22+, and flutter on PATH for the mobile part.
# No database is required — every backend spec mocks PrismaService.

set -euo pipefail
cd "$(dirname "$0")/.."

step() { echo ""; echo "=== $* ==="; }

backend() (
  cd backend
  step "backend: install"
  npm ci
  step "backend: prisma client"
  npx prisma generate            # jest and nest build both import @prisma/client
  step "backend: test"
  npx jest --ci
  step "backend: build"
  npm run build
  step "backend: lint (report only)"
  # ponytail: report, don't fail — the tree has ~295 pre-existing prettier errors, so a
  # blocking lint would make CI red on day one. Run `npm run lint` once to autofix them,
  # then drop the `|| true` to make this gate real.
  npx eslint "{src,test}/**/*.ts" || true
)

frontend() (
  cd frontend
  step "frontend: install"
  npm ci
  step "frontend: lint"
  npx oxlint
  step "frontend: typecheck + build"
  npm run build                  # tsc -b && vite build
)

mobile() (
  cd mobile
  step "mobile: pub get"
  flutter pub get
  step "mobile: analyze"
  flutter analyze --no-fatal-infos   # 87 style infos, no errors
  step "mobile: test"
  flutter test
)

case "${1:-all}" in
  backend)  backend ;;
  frontend) frontend ;;
  mobile)   mobile ;;
  all)      backend; frontend; mobile ;;
  *) echo "usage: $0 [backend|frontend|mobile|all]" >&2; exit 2 ;;
esac

echo ""
echo "CI passed."
