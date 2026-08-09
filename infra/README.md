# Infrastructure

One EC2 host running the whole stack under docker compose. Terraform builds the box,
Ansible puts the app on it.

```
internet ──▶ :80 nginx ──┬──▶ /        static SPA (frontend/dist)
                         └──▶ /api/    backend:3000 (NestJS)
                                          ├── postgres:5432  (volume: postgres_data)
                                          ├── redis:6379
                                          └── /data/uploads  (volume: uploads_data)
```

Only port 80 and port 22 are open. Postgres, Redis and the backend are reachable only on
the compose network.

## Files

| Path | What it is |
|---|---|
| `terraform/` | Security group, EC2 instance, elastic IP. Writes `ansible/inventory.ini`. |
| `ansible/deploy.yml` | Installs docker, ships the app, runs compose, waits for a 200. |
| `ansible/templates/env.j2` | The host's `.env`. Secrets arrive as extra-vars, never from git. |
| `../docker-compose.prod.yml` | The production stack. |
| `../backend/Dockerfile` | Two-stage backend image. Runs `prisma migrate deploy` at boot. |
| `../scripts/cd.sh` | The entry point both you and CI call. |

## First deploy

Ansible has no Windows control node — run this from WSL or from CI.

```bash
# 1. an EC2 key pair must already exist in the region
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
$EDITOR infra/terraform/terraform.tfvars     # key_name + your IP/32

# 2. build the host (writes infra/ansible/inventory.ini)
./scripts/cd.sh provision

# 3. put the app on it
export POSTGRES_PASSWORD=... JWT_SECRET=... JWT_REFRESH_SECRET=...
./scripts/cd.sh deploy
```

`terraform output app_url` prints where it landed.

Every later deploy is just step 3 — or the **CD** workflow in Actions, which needs these
repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DEPLOY_HOST`,
`DEPLOY_SSH_KEY`, `EC2_KEY_NAME`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.

## Deliberately not built yet

| Missing | Add it when |
|---|---|
| HTTPS | You have a domain. Then: Route 53 record + certbot in the nginx container, or put an ALB in front. |
| RDS | The data must outlive the instance, or you want automated backups. Swap `DATABASE_URL`, delete the `postgres` service. |
| S3 for uploads | Uploads outgrow the disk. The backend already hides storage behind `StorageDriver` — it is a one-line provider swap. |
| Remote terraform state | A second person runs terraform. Local state races. |
| Zero-downtime deploys | `docker compose up` restarts the backend, so there is a few-second gap. Needs two instances + an ALB. |
