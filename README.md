# Otto Intelligence by DayOne Venture Partners

Proof-of-concept: an intelligence layer for VC + PE teams — thesis, signals, deal radar, relationships, evidence, IC and portfolio.

```bash
npm install
npm run dev
```

Deploys on Vercel (Vite preset, output `dist`).

## Live data

`/api/live` (Vercel function, `api/live.ts`) pulls public market signals from Google News RSS — funding rounds, sponsor buyouts, strategic M&A, executive appointments, layoffs, AI launches, exits — classifies them into signal families and scores them against the DayOne theses. Cached 5 minutes at the edge; the UI refreshes every 2 minutes.

Optional: set `SEC_USER_AGENT` (e.g. `DayOne Venture Partners ops@yourdomain.com`) in Vercel to also stream live SEC EDGAR Form D filings. SEC requires a declared contact in the User-Agent.

Company, portfolio, relationship and decision records are illustrative seed data.
