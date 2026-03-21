// CricAPI key
export const CRICKET_API_KEY = "4936fea0-ba32-4484-81de-8ca82f6501f6";

const API_BASE = "https://api.cricapi.com/v1";

export interface LiveMatch {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: string;
  scoreB: string;
  oversA: string;
  oversB: string;
  status: string;
  event: string;
}

interface ApiMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  teams: [string, string];
  score: Array<{ r: number; w: number; o: number; inning: string }>;
  matchStarted: boolean;
  matchEnded: boolean;
}

interface ApiResponse {
  data: ApiMatch[];
  status: string;
}

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  try {
    const res = await fetch(
      `${API_BASE}/currentMatches?apikey=${CRICKET_API_KEY}&offset=0`,
    );
    if (!res.ok) return [];

    const json: ApiResponse = await res.json();
    if (!json.data || !Array.isArray(json.data)) return [];

    const live = json.data.filter(
      (m) => m.matchStarted === true && m.matchEnded === false,
    );

    return live.map((match): LiveMatch => {
      const s0 = match.score?.[0];
      const s1 = match.score?.[1];
      return {
        id: match.id,
        teamA: match.teams?.[0] ?? "Team A",
        teamB: match.teams?.[1] ?? "Team B",
        scoreA: s0 ? `${s0.r}/${s0.w}` : "Yet to bat",
        oversA: s0 ? `${s0.o}` : "0",
        scoreB: s1 ? `${s1.r}/${s1.w}` : "Yet to bat",
        oversB: s1 ? `${s1.o}` : "0",
        status: match.status,
        event: match.name,
      };
    });
  } catch {
    return [];
  }
}
