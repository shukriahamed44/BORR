#!/usr/bin/env bash
#
# Deploy entry point — the CD half of scripts/ci.sh. Same commands locally and in Actions.
#
#   ./scripts/cd.sh provision   # terraform apply: build the host, write the ansible inventory
#   ./scripts/cd.sh deploy      # build artifacts + ansible: put the app on the host
#   ./scripts/cd.sh             # both
#
# Needs: terraform, ansible, node 22+. Ansible has no Windows control node — run this from
# WSL or from CI.
#
# Secrets come from the environment, never from a file in git:
#   POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

set -euo pipefail
cd "$(dirname "$0")/.."

step() { echo ""; echo "=== $* ==="; }

require_env() {
  for name in "$@"; do
    if [ -z "${!name:-}" ]; then
      echo "missing required environment variable: $name" >&2
      exit 1
    fi
  done
}

provision() (
  cd infra/terraform
  step "terraform init"
  terraform init -input=false
  step "terraform apply"
  terraform apply -input=false -auto-approve
)

deploy() {
  require_env POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET

  step "build frontend"
  # Same-origin API: nginx proxies /api to the backend, so no absolute URL is baked in.
  ( cd frontend && npm ci && VITE_API_URL=/api/v1 npm run build )

  step "package backend"
  # git archive, not a copy: only committed files ship, and node_modules can never leak in.
  mkdir -p dist
  git archive HEAD backend -o dist/backend.tar

  step "ansible deploy"
  ansible-playbook -i infra/ansible/inventory.ini infra/ansible/deploy.yml \
    --extra-vars "postgres_password=${POSTGRES_PASSWORD}" \
    --extra-vars "jwt_secret=${JWT_SECRET}" \
    --extra-vars "jwt_refresh_secret=${JWT_REFRESH_SECRET}"
}

case "${1:-all}" in
  provision) provision ;;
  deploy)    deploy ;;
  all)       provision; deploy ;;
  *) echo "usage: $0 [provision|deploy|all]" >&2; exit 2 ;;
esac

echo ""
echo "CD finished."
