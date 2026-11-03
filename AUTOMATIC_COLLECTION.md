# Official source refresh

The GitHub Actions workflow runs daily at 01:17 UTC (10:17 Korea time; GitHub may delay it). It checks one rotating batch of up to 12 dynamic official indexes out of the configured sources, then downloads and parses at most 12 new or previously failed documents. Reference-only sources remain manual until a reliable dynamic discovery adapter is configured. No AI or Supabase credentials are used.

The job changes only data/official-catalog.json and data/reading-content.json. It does not alter data/analysis.json, evidence, claims, metrics, events or signals. A failed download remains a discovered official link and is retried on that source's next turn. No-change runs do not create commits or deployments. Each data commit triggers the existing Vercel Git integration.

Run locally: corepack pnpm test:collector; node automation/refresh-official.mjs --dry-run --batch=12 --max-new=12. In GitHub Actions, use workflow_dispatch for a manual first run. Review its run log for checked, failed, discovered, downloaded and parsed counts. Paid AI analysis is a separate workflow and is not enabled.
