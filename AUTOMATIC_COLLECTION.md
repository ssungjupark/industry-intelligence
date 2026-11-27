# Official source refresh

The GitHub Actions workflow is scheduled daily at 01:17 UTC (10:17 Korea time). Changes to the collector or its source registry also start a run. It checks daily-priority official sources and a rotating batch of up to 12 other official sources. Daily-priority sources are allowed up to 20 download attempts and the rotating group up to 12. Reviewed references without a discovery configuration remain manual.

The collector updates data/official-catalog.json and data/reading-content.json and preserves the reviewed analysis graph. Failed downloads can be retried when their source runs again. The workflow also refreshes configured home indicators. It only commits when an output changes.

Run locally with corepack pnpm test:collector and node automation/refresh-official.mjs --dry-run. Add --group=daily to check daily sources separately. GitHub Actions also supports a manual run. Check the run summary for discovery, download and parsing counts. No AI or Supabase credentials are used.
