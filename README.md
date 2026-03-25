# Care

Caregiving coordination platform. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full technical reference.

## First-time setup

**Prerequisites:** Node 20+, pnpm 9+, [1Password CLI](https://developer.1password.com/docs/cli/get-started/), [direnv](https://direnv.net), Xcode (iOS)

```bash
# 1. Clone and install
pnpm install

# 2. Configure secrets
cp .env.example .env
# → open .env and set SERVICE_ACCOUNT_KEY to your 1Password service account token

# 3. Hook direnv into your shell (once, if not already done)
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc && source ~/.zshrc
direnv allow

# 4. Link Railway project
railway login
railway link -p $(op read op://care/railway/project_id)
```

## Daily commands

```bash
pnpm ios          # Run app in iOS simulator
pnpm dev          # Run all services (API + web)
pnpm ship         # Deploy API + marketing site to Railway
pnpm ship:api     # Deploy API only
pnpm ship:web     # Deploy marketing site only
```

All commands pull secrets from 1Password automatically via direnv.
