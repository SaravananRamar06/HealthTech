# Baseline check — 2026-10-10

Ran against `HealthTech/` (must run there; this folder holds notes only).

## npm run build — PASS
Next.js 16.4.0 (Turbopack), "Cache Components enabled", "Partial Prefetching enabled".
Compiled 3.3s, TypeScript clean, 8/8 static pages generated.

Routes:
- `/`            ○ static
- `/vault`       ○ static
- `/vault/import`○ static
- `/vault/share` ○ static
- `/s/[id]`      ◐ Partial Prerender  ← the one dynamic hole; P3 owns it

**Do this before connecting Vercel.** The build is green, so the repo imports and
deploys cleanly as-is.

## npm test — FAIL (expected)
```
No test files found, exiting with code 1
include: ["src/**/*.test.ts"]
```
No `.test.ts` exists anywhere in `src/`. DoD requires four suites:
flag rules (`analyze.test.ts`), encryption round-trip + tamper failure,
payload scoping, plus the API smoke test.

## Two config issues to fix before Sprint 1
1. **Vitest config is loaded as CommonJS.** Warning on every run:
   `ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a .mjs
   extension or set "type": "module"`. Rename to `vitest.config.mts` or drop
   `"type": "module"` risk — the latter affects Next, so prefer `.mts`.
2. **`environment: 'node'`.** Node 24 has WebCrypto globally so
   `crypto.subtle` works for the encryption tests, but anything touching
   `localStorage` / IndexedDB / DOM needs `jsdom` added as a devDependency.

## Not done (still outstanding)
- Vercel connect + 4 env vars
- P1: vault store, demo JSON (P4 owns the files), record components, dashboard
- P2 / P3 / P4 slices