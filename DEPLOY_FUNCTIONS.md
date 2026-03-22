# Deploy Firebase Cloud Functions

This guide sets up the `/getMatches` backend for FansBattle.
Run these commands once from your machine.

## Prerequisites

```bash
npm install -g firebase-tools
firebase login
```

## 1. Set the CricAPI key as a Firebase Secret

```bash
firebase functions:secrets:set CRIC_API_KEY
# When prompted, paste: 76e4e258-7898-4311-ace0-4196d49df2b7
```

This stores the key in Google Secret Manager — it is never written to code or
logs.

## 2. Install function dependencies

```bash
cd functions
npm install
cd ..
```

## 3. Deploy

```bash
firebase deploy --only functions --project project-bc4b53b0-b928-4234-837
```

After deploy, the function URL will be:
```
https://us-central1-project-bc4b53b0-b928-4234-837.cloudfunctions.net/getMatches
```

This URL is already configured in the frontend (`src/frontend/src/lib/cricketApi.ts`).
No further frontend changes are needed once the function is live.

## 4. Verify

Open this URL in your browser — you should see a JSON response with match data.

```
https://us-central1-project-bc4b53b0-b928-4234-837.cloudfunctions.net/getMatches
```

## Notes

- The function caches API results for **7 minutes** server-side.
- The frontend adds an additional **8-minute** client-side cache on top.
- The API key is **never** exposed to the browser at any point.
- CORS is enabled so the deployed Caffeine frontend can call the function.
