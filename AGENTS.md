<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Handover team rules (hackathon, deadline 20:30 IST)

- The full plan is in `docs/PLAN.md`. Scope, ownership and the timeline there are binding.
- The shared contract is `src/lib/types.ts`. Only P1 changes it; announce every change in team chat.
- Edit only the files you own (see the ownership table in `docs/PLAN.md`, section F). Shared files (`types.ts`, `layout.tsx`, `package.json`) change only through P1.
- Next.js 16 with `cacheComponents: true`: do not export `dynamic`, `revalidate` or `fetchCache` from routes (removed). Route handler `params` is a Promise. Pages that use browser storage are client components.
- Secrets are server-only. Never prefix them with `NEXT_PUBLIC_`. Never commit `.env.local`.
- Synthetic data only. Never call anything "verified". No diagnosis, treatment or dose advice. No compliance claims.
- Wording for sources: "Patient-reported", "From document · confirmed by patient", "From document · corrected by patient", "AI-extracted · awaiting review".
- Feature freeze at 18:15 IST. No deploys while the demo video is being recorded.
