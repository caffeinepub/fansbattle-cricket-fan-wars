# FansBattle – Cricket Fan Wars

## Current State
- Frontend calls CricAPI (`api.cricapi.com`) directly from the browser using a hardcoded API key in `cricketApi.ts`.
- 10-minute `setInterval` auto-refresh is running in `HomeTab.tsx`.
- In-memory cache (8-min TTL) exists in `cricketApi.ts` but only on the frontend.

## Requested Changes (Diff)

### Add
- Motoko HTTP outcall endpoint `getMatches()` in `main.mo` that proxies CricAPI calls server-side with API key stored in backend only.
- Backend in-memory cache (7-minute TTL) in Motoko to reduce API quota usage.
- Frontend `backendApi.ts` helper that calls the canister `getMatches()` endpoint.

### Modify
- `cricketApi.ts`: Remove direct `fetch()` to CricAPI. Replace with a call to the backend canister. Keep frontend-side cache (8-min TTL) as a secondary layer to avoid redundant canister calls.
- `HomeTab.tsx`: Remove all `setInterval` / auto-refresh logic. Fetch on initial mount only, plus manual "Refresh Now" button. Update cache label to remove "auto-refreshes every 10 min" text.

### Remove
- `CRICKET_API_KEY` export from frontend — API key must never appear in frontend code.
- `REFRESH_INTERVAL_MS` constant and the `useEffect` that sets up `setInterval` in `HomeTab.tsx`.
- `intervalRef` from `HomeTab.tsx`.

## Implementation Plan
1. Select `http-outcalls` Caffeine component.
2. Generate Motoko backend with `getMatches()` HTTP outcall to CricAPI, 7-min cache, proper error handling.
3. Update `cricketApi.ts` to call backend canister via `window.ic` / actor, remove API key and direct fetch.
4. Update `HomeTab.tsx` to remove setInterval and auto-refresh, only load on mount + manual button.
