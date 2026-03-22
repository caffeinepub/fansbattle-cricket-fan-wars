const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const https = require("https");

// ─── Secure API Key (stored in Firebase Secret Manager) ───────────────────────
// To set the secret, run:
//   firebase functions:secrets:set CRIC_API_KEY
// Then paste: 76e4e258-7898-4311-ace0-4196d49df2b7
const CRIC_API_KEY = defineSecret("CRIC_API_KEY");

// ─── In-memory cache (7-minute TTL) ───────────────────────────────────────────
let _cache = null; // { data: string, fetchedAt: number }
const CACHE_TTL_MS = 7 * 60 * 1000;

function isCacheValid() {
  return _cache !== null && Date.now() - _cache.fetchedAt < CACHE_TTL_MS;
}

// ─── Helper: fetch from CricAPI over HTTPS ────────────────────────────────────
function fetchFromCricAPI(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.cricapi.com",
      path: `/v1/currentMatches?apikey=${apiKey}&offset=0`,
      method: "GET",
      headers: { "Accept": "application/json" },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve(body));
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out after 10 seconds"));
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

// ─── Cloud Function: GET /getMatches ─────────────────────────────────────────
exports.getMatches = onRequest(
  { secrets: [CRIC_API_KEY], cors: true },
  async (req, res) => {
    // Only allow GET
    if (req.method !== "GET") {
      res.status(405).json({ status: "failure", message: "Method not allowed" });
      return;
    }

    // Return cached data if still valid
    if (isCacheValid()) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Content-Type", "application/json");
      res.status(200).send(_cache.data);
      return;
    }

    const apiKey = CRIC_API_KEY.value();
    if (!apiKey) {
      res.status(500).json({
        status: "failure",
        message: "Server configuration error. API key not set.",
      });
      return;
    }

    try {
      const rawBody = await fetchFromCricAPI(apiKey);

      // Validate it's parseable JSON
      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        res.status(502).json({
          status: "failure",
          message: "Invalid response from cricket data provider.",
        });
        return;
      }

      const status = String(parsed?.status ?? "").toLowerCase();

      if (status === "failure" || status === "error") {
        // Mask raw error detail — just return a clean message
        const msg = String(parsed?.message ?? parsed?.error ?? "Unknown error");
        const isQuota =
          msg.toLowerCase().includes("quota") ||
          msg.toLowerCase().includes("limit") ||
          msg.toLowerCase().includes("exceed");

        res.status(200).json({
          status: "failure",
          message: isQuota
            ? "API quota exceeded. Matches will load again after midnight."
            : "Cricket data temporarily unavailable. Please try again shortly.",
        });
        return;
      }

      // Success — cache and return
      _cache = { data: rawBody, fetchedAt: Date.now() };
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Content-Type", "application/json");
      res.status(200).send(rawBody);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isTimeout = message.toLowerCase().includes("timeout");

      res.status(502).json({
        status: "failure",
        message: isTimeout
          ? "Cricket data server took too long to respond. Please retry."
          : "Could not reach the cricket data server. Please try again shortly.",
      });
    }
  },
);
