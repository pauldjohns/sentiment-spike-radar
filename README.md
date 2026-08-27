# sentiment-spike-radar

Watches retail-investor chatter for unusual bursts of sentiment on a ticker, scores each burst
against the price action that followed, and keeps a record of whether the signal was worth anything.

The scoring loop is the point. Anyone can plot mention volume; the harder question is whether a spike
on Tuesday told you anything by Friday, and this keeps score on itself well enough to answer that.

## What it does

1. **Ingest.** Scheduled Supabase Edge Functions pull StockTwits messages, respecting rate limits and
   market hours, and batch them into Postgres.
2. **Score sentiment.** A Hugging Face model classifies message sentiment, with a disparity checker
   that flags when model output and the platform’s own labels disagree – the disagreement is often
   more informative than either.
3. **Detect anomalies.** Mention volume and sentiment are compared against each ticker’s own recent
   baseline, so a spike means unusual *for that ticker* rather than loud in absolute terms.
4. **Enrich.** Each candidate signal is joined to price metadata (Finnhub, plus a small self-hosted
   yfinance service for history) and stored with the context needed to grade it later.
5. **Grade.** Evaluation functions revisit signals after the fact and mark them succeeded or failed
   against a configurable threshold. A replay path re-runs historical windows so a scoring change can
   be tested against past data instead of only against the future.
6. **Show.** A React dashboard for live signals, system health, ingestion monitoring and admin.

## Stack

Vite + React + TypeScript + Tailwind + shadcn/ui on the front, Supabase (Postgres, auth, Edge
Functions in Deno) behind it, and a small Flask service for yfinance history. 54 migrations, 13 Edge
Functions.

## Run it

```bash
npm install --legacy-peer-deps
cp .env.example .env      # fill in SUPABASE_URL and SUPABASE_ANON_KEY
npm run dev
```

`--legacy-peer-deps` is currently required: a transitive peer range conflicts under npm’s strict
resolver.

**There is no default project.** The generated Supabase client used to carry a hardcoded project URL
and anon key as fallbacks, which meant every clone pointed at one person’s database. That fallback is
gone and the client throws if the environment is not set. If you regenerate `src/integrations/
supabase/client.ts` with the Supabase tooling, re-apply that edit – the generator will put the
fallback back.

For a working deployment you also need: a Supabase project (`supabase db push` applies the
migrations, `supabase functions deploy` the functions), and secrets set on the functions –
`STOCKTWITS_API_TOKEN`, `HUGGINGFACE_API_KEY`, `FINNHUB_API_KEY`, plus the Supabase service role key.
All are read from the environment; none are in this repo.

## Reading the code

- `supabase/functions/ingest-sentiment-data/` is the most interesting directory: auth handling, batch
  processing, market-hours gating and rate limiting, separated rather than tangled in one handler.
- `src/services/` carries a `Real*` prefix on the services that hit live APIs, alongside the
  simulated versions used in development. Worth knowing before you wonder why there are two of each.
- `supabase/migrations/` is the schema’s history, in order.

## Before you deploy this

Two things you inherit from the original design and should change deliberately:

- **Several edge functions run with `verify_jwt = false`** (see `supabase/config.toml`) and answer
  `Access-Control-Allow-Origin: *`. They were built to be called by a scheduler, and as shipped they
  are publicly invokable endpoints that write through the service-role key. Anyone who finds your
  project URL can burn your StockTwits, Hugging Face and Finnhub quota. Put a shared secret or a JWT
  in front of them before pointing them at a funded project.
- **Many tables carry `USING (true)` RLS policies**, which is world-readable and in places
  world-writable behind the anon key. That was tolerable for a single-operator research toy and is
  not tolerable for anything with users. Read the policies in `supabase/migrations/` before you
  deploy, not after.

## A caution

This is a research toy for studying whether a sentiment burst predicts anything. It is not investment
advice, it is not a trading system, and the honest finding from this kind of work is usually that the
signal is weak and arrives late. Treat a green dashboard as an invitation to check the scoring, not
as a reason to trade.
