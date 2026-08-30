# Deployment

Everything runs on AWS under one domain:

```
<your-domain> (Route 53 → CloudFront, ACM cert)
├── /*      → S3 bucket           (Expo web export, private, read via OAC)
└── /api/*  → Lambda Function URL (Hono server, nodejs22.x arm64)
```

- The Lambda **Function URL** is free and permanent — it never changes for the
  lifetime of the function, so nothing has to be re-wired between deploys.
  Clients never see it: CloudFront serves the API on the same domain as the
  app, which also means there is no CORS in production.
- **`www.<domain>` is redirect-only.** A CloudFront viewer-request function
  answers it with a `301` to the apex, preserving path and query string. It is
  attached to both behaviours, so `www…/api/*` redirects too.
- The web build is a static single-page app (`expo export --platform web`), and
  the same function rewrites extension-less paths to `/index.html` so client
  routes survive a refresh — `/api/*` is excluded.
- **Postgres is not provisioned here.** Bring a connection string (Neon and
  Supabase free tiers work well) and set it as the Lambda's `DATABASE_URL`.
- **Use the pooled endpoint and `?connection_limit=1&pool_timeout=20`.** Each
  warm Lambda container holds its own Prisma connection pool, so the default
  sizing multiplies by the number of live containers and exhausts a free-tier
  database under modest traffic. This is the most common way a Prisma-on-Lambda
  deployment falls over, and it fails as confusing timeouts rather than as an
  obvious connection error.

## Two settings that are not the usual defaults

Generating a knowledge map is a single large model call that routinely runs
20–40 seconds, which is far longer than ordinary CRUD. Two timeouts are raised
to match, and both matter — miss either and topic creation fails in a way that
looks like a bug in the app:

| Setting | Default | Here | Why |
|---|---|---|---|
| Lambda `timeout` | 15s | **120s** | The generation itself |
| CloudFront `origin_read_timeout` | 30s | **60s** | 60 is the ceiling without a quota increase |

If map generation starts timing out, raise the Lambda first and request a
CloudFront quota increase second.

## One-time setup

Run Terraform with **admin** credentials (your own, not the deployer's) from
`deployment/terraform`. State lives in a private, versioned, SSE-encrypted S3
bucket; create it first, then init pointing at it:

```sh
bash deployment/scripts/bootstrap-state-bucket.sh   # learnloop-tfstate-<account-id>
cd deployment/terraform
terraform init -backend-config="bucket=learnloop-tfstate-<account-id>"
terraform apply -var="domain_name=example.com"
```

`domain_name` has no default on purpose — it must already have a Route 53
hosted zone in this account, because the certificate is DNS-validated against
it, and a wrong value fails ten minutes into the apply.

That creates the bucket, distribution, certificate, Route 53 records for the
apex and `www`, the `learnloop-api` Lambda with its Function URL, and a
`learnloop-deployer` IAM user whose policy is scoped to exactly: sync that
bucket, invalidate that distribution, update that function's code.

> The first apply takes ~5–10 minutes (certificate validation + CloudFront).

Then wire up GitHub Actions (**Settings → Secrets and variables → Actions**)
from the Terraform outputs:

| Kind | Name | From |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` | `terraform output deployer_access_key_id` |
| Secret | `AWS_SECRET_ACCESS_KEY` | `terraform output -raw deployer_secret_access_key` |
| Secret | `DATABASE_URL` | your Postgres connection string |
| Variable | `S3_BUCKET` | `terraform output -raw web_bucket` |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |
| Variable | `SITE_URL` | `https://<your-domain>` |

`DATABASE_URL` is a secret because the workflow runs `prisma migrate deploy`
with it before pushing new Lambda code, so a deploy that adds a migration
applies it. It is the same connection string the Lambda holds.

Finally give the function its database and model key. Terraform ignores later
changes to the function's environment, so these survive future applies:

```sh
terraform output -raw set_environment_command   # then fill in the placeholders
```

That output deliberately lists every key, because `--environment` **replaces**
the whole variables map rather than merging into it: a command that sets only
`DATABASE_URL` silently deletes the provider key and breaks every generation.

## Before this is public

Registration is open and each topic costs a model call. The server caps
generations per user (10/hour, 100 topics), but nothing yet limits how many
accounts one person can create, so put a rate limit or a sign-up gate in front
of `/api/auth/register` before exposing this to the internet — otherwise the
model bill is unbounded.

## Deploying

Push to `main`. The workflow typechecks, tests and lints first, then exports
the web app to S3, invalidates CloudFront, applies migrations, and updates the
Lambda. `deployment/scripts/build-lambda.sh` produces the bundle and can be run
locally (`make lambda`) to check a packaging change without a deploy.

The bundle ships the **arm64** Prisma query engine next to `index.js`, because
the bundled client loads its engine from its own directory at runtime. A bundle
built for arm64 will not run Prisma queries on an x86 machine — that is
expected, not a packaging fault.
