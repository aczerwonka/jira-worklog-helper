// Models for Worklog application

export interface Worklog {
  id?: string;
  ticketKey: string;
  timeSpentSeconds: number;
  comment: string;
  date?: string; // ISO format: YYYY-MM-DD
  username?: string;
  author?: string;
  started?: string;
}

export interface JiraIssueSummary {
  id: string;
  key: string;
  summary: string;
}

export interface WorklogHistoryItem {
  ticketKey: string;
  summary: string;
  author?: string;
  timeSpentSeconds?: number;
  started?: string;
}

export interface SuggestionRequest {
  ticketKey: string;
  baseComment?: string;
}

export interface SuggestionResponse {
  prefixes: string[];
}

export interface FavoriteTicket {
  id: string;
  key: string;
  label: string;
}

export interface FavoriteWorklog {
  id?: string;
  ticketKey: string;
  comment: string;
  defaultTimeMinutes: number;
}

export interface JiraWorklogResponse {
  id: string;
  author: string;
  timeSpentSeconds: number;
  started: string;
}

export interface WorklogEntry {
  date: string; // YYYY-MM-DD
  workTime: string; // human readable e.g. "2 godz. 30 min"
  ticketNumber: string; // Jira issue key
}
