import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Worklog,
  JiraIssueSummary,
  WorklogHistoryItem,
  SuggestionRequest,
  SuggestionResponse,
  FavoriteTicket,
  JiraWorklogResponse,
  WorklogEntry,
} from '../models/worklog.model';

@Injectable({
  providedIn: 'root',
})
export class WorklogService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // Create a new worklog
  createWorklog(worklog: Worklog): Observable<JiraWorklogResponse> {
    return this.http.post<JiraWorklogResponse>(`${this.apiUrl}/worklogs`, worklog);
  }

  // Get worklog history
  getHistory(days: number = 7): Observable<WorklogHistoryItem[]> {
    return this.http.get<WorklogHistoryItem[]>(`${this.apiUrl}/worklogs/history?days=${days}`);
  }

  // Get issue summary from Jira
  getIssueSummary(key: string): Observable<JiraIssueSummary> {
    return this.http.get<JiraIssueSummary>(`${this.apiUrl}/jira/${key}/summary`);
  }

  // Get suggested prefixes for a ticket
  getSuggestedPrefixes(request: SuggestionRequest): Observable<SuggestionResponse> {
    return this.http.post<SuggestionResponse>(
      `${this.apiUrl}/suggestions/prefixes`,
      request
    );
  }

  // Get favorite tickets
  getFavorites(): Observable<FavoriteTicket[]> {
    return this.http.get<FavoriteTicket[]>(`${this.apiUrl}/favorites`);
  }

  // Get worklogs list for a date range
  getWorklogsList(from: string, to: string) {
    return this.http.get<WorklogEntry[]>(`${this.apiUrl}/worklogs/list?from=${from}&to=${to}`);
  }
}
