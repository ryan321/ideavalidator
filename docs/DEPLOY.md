# Deploying to Fly.io

Validorian is a persistent single-node app: one machine + one volume holding the
SQLite database. Don't run it serverless or multi-instance — the DB is a local file and
validations run as in-process background jobs.

## One-time setup

```bash
# 1. Install + log in
brew install flyctl        # or: curl -L https://fly.io/install.sh | sh
fly auth login

# 2. Create the app (edit `app` and `primary_region` in fly.toml first)
fly launch --no-deploy --copy-config --name YOUR-APP-NAME

# 3. Create the data volume IN THE SAME REGION as the app (3 GB is plenty to start)
fly volumes create iv_data --size 3 --region YOUR-REGION

# 4. Set secrets (these are NOT in fly.toml — they're encrypted at Fly)
fly secrets set \
  OPENROUTER_API_KEY=sk-or-... \
  MODEL_SCORING=anthropic/claude-opus-4.8 \
  MODEL_WRITING=google/gemini-3-flash-preview \
  MODEL_AUDIT=openai/gpt-5.1 \
  SCORING_SAMPLES=2 \
  EXA_API_KEY=...                 # enables the web evidence source + competitor intel
# Optional — API trial credits per self-minted key (default 5; 0 to require top-up):
# fly secrets set API_TRIAL_CREDITS=5

# 5. Deploy
fly deploy
```

Your app is now at `https://YOUR-APP-NAME.fly.dev`. Open it, sign up, and you're in.
(`NODE_ENV=production` is set in fly.toml, so session cookies are `Secure`.)

## Stripe (before charging real money)

```bash
fly secrets set \
  STRIPE_SECRET_KEY=sk_live_or_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  CAMPAIGN_PRICE_CENTS=2500        # your price
```

Then in the Stripe dashboard add a webhook endpoint:
`https://YOUR-APP-NAME.fly.dev/api/billing/webhook` → events
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.
Test the whole flow with card `4242 4242 4242 4242` before going live.

## Backups

- **Automatic:** Fly snapshots the volume daily (5-day retention) — baseline safety, no setup.
- **On-demand:** `fly ssh console -C "npm run backup"` writes a timestamped copy under
  `/data/backups` (keeps the last 14).
- **Continuous (recommended once you have paying users):** run
  [litestream](https://litestream.io) to stream the DB to S3/R2 for point-in-time restore.

## Operating notes

- **Mint an API key on the box:** `fly ssh console -C "npm run apikey -- --label X --credits 100"`
- **Re-run calibration after a prompt/model change:** `fly ssh console -C "npm run calibrate -- --yes"`
  (spends OpenRouter credit).
- **Scale up** if Opus + Chromium get tight: bump `memory` in fly.toml and `fly deploy`.
- **Never** set `min_machines_running = 0` or `auto_stop_machines = "stop"` — a stopped
  machine loses in-flight validations and detaches from the SQLite file.
- **PDF export** needs the Chromium in the image (already installed, `CHROME_PATH` set).
  Drop it from the Dockerfile to slim the image if you don't need server-side PDF.
