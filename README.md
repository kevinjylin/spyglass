# precitrus

Inline fact-check badges on X / Twitter, plus a public live-feed dashboard.
One `GEMINI_API_KEY` powers everything: **Gemma 4** for neutralization and
claim extraction, **Gemini 2.5 Flash + Google Search grounding** for claim
verification.

```
apps/
  extension/   # Plasmo content script that adds badges on x.com / twitter.com
  api/         # FastAPI backend (pipeline + Supabase persistence)
  dashboard/   # Next.js App Router live feed + manual checker
supabase/
  schema.sql   # tweets / claims / verifications + public-read RLS + realtime
```

## Architecture

```
Extension --POST /tweets/check--> FastAPI
                                    |-- Gemma:  neutralize
                                    |-- Gemma:  extract atomic claims
                                    |-- Gemini + Google Search: verify each fact claim
                                    +-- Supabase (tweets / claims / verifications)
                                                  |
                                                  v realtime
                                                Next.js dashboard
```

## 1. Supabase

Apply the schema in the Supabase SQL editor (or `supabase db push`):

```
supabase/schema.sql
```

This creates `tweets`, `claims`, `verifications`, public-select RLS policies,
and adds `tweets` to the `supabase_realtime` publication.

## 2. API

```
cd apps/api
cp .env.example .env       # fill in GEMINI_API_KEY + SUPABASE_*
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Endpoints:
- `POST /tweets/check` — body `{ tweet_id, text, author_handle?, url? }`
- `GET /stats`
- `GET /healthz`

Docker:
```
docker build -t precitrus-api apps/api
docker run --env-file apps/api/.env -p 8000:8000 precitrus-api
```

## 3. Extension

```
cd apps/extension
npm install
npm run dev    # loads at chrome://extensions -> Load unpacked -> build/chrome-mv3-dev
```

Open the options page once and confirm the API base URL (default
`http://localhost:8000`). No Gemini key ever lives in the extension.

## 4. Dashboard

```
cd apps/dashboard
cp .env.example .env.local  # NEXT_PUBLIC_API_BASE + NEXT_PUBLIC_SUPABASE_*
npm install
npm run dev                  # http://localhost:3000
```

`/` shows the stats overview + live feed (Supabase realtime on `tweets`).
`/check` lets you run a manual check against the API.

## Smoke test

1. Apply schema, start API (`uvicorn`), open dashboard (`npm run dev`).
2. Load the extension into Chrome and visit x.com — badges should appear under
   each tweet within ~5–15s on first check (cached on repeat).
3. Confirm rows show up under the dashboard's live feed.

## Tunables

- `verify_concurrency` (default 3) caps parallel grounding calls per tweet —
  raise carefully against Gemini quotas.
- `gemma_rewrite_model`, `gemma_extract_model`, `gemini_verify_model` in
  `apps/api/app/config.py` are env-overridable. Confirm the current Gemma 4
  model id in Google's model list before first run; the placeholder
  `gemma-4-26b-a4b-it` in this repo is a guess.
- Prompts in `apps/api/app/pipeline/{neutralize,extract_claims,verify}.py`
  are first drafts — review and tune for your tone/recall trade-offs.
- DOM selectors in `apps/extension/src/contents/selectors.ts` are X-specific
  and break when X reships. Update there.
