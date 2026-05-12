// MOCK DATA — not real scan history
// Used for UI development only

export interface HistoryEntry {
  id:        string;
  domain:    string;
  scanTime:  string;
  score:     number;
  grade:     "A" | "B" | "C" | "D" | "F";
  status:    "Low Risk" | "Medium Risk" | "High Risk";
  issues:    number;
}

export const mockHistory: HistoryEntry[] = [
  {
    id:       "h-001",
    domain:   "google.com",
    scanTime: "2026-05-12T10:42:00.000Z",
    score:    82,
    grade:    "B",
    status:   "Medium Risk",
    issues:   4,
  },
  {
    id:       "h-002",
    domain:   "cloudflare.com",
    scanTime: "2026-05-11T14:15:00.000Z",
    score:    96,
    grade:    "A",
    status:   "Low Risk",
    issues:   1,
  },
  {
    id:       "h-003",
    domain:   "github.com",
    scanTime: "2026-05-11T09:30:00.000Z",
    score:    91,
    grade:    "A",
    status:   "Low Risk",
    issues:   2,
  },
  {
    id:       "h-004",
    domain:   "mozilla.org",
    scanTime: "2026-05-10T17:05:00.000Z",
    score:    78,
    grade:    "C",
    status:   "Medium Risk",
    issues:   5,
  },
  {
    id:       "h-005",
    domain:   "example.com",
    scanTime: "2026-05-09T11:22:00.000Z",
    score:    44,
    grade:    "D",
    status:   "High Risk",
    issues:   9,
  },
  {
    id:       "h-006",
    domain:   "badssl.com",
    scanTime: "2026-05-08T20:00:00.000Z",
    score:    18,
    grade:    "F",
    status:   "High Risk",
    issues:   12,
  },
  {
    id:       "h-007",
    domain:   "vercel.com",
    scanTime: "2026-05-07T08:44:00.000Z",
    score:    89,
    grade:    "B",
    status:   "Low Risk",
    issues:   3,
  },
];
