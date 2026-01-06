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
  FavoriteWorklog,
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

  // Get favorite worklogs (new enhanced favorites)
  getFavoriteWorklogs(): Observable<FavoriteWorklog[]> {
    return this.http.get<FavoriteWorklog[]>(`${this.apiUrl}/favorites/worklogs`);
  }

  // Add a new favorite worklog
  addFavoriteWorklog(favorite: FavoriteWorklog): Observable<FavoriteWorklog> {
    return this.http.post<FavoriteWorklog>(`${this.apiUrl}/favorites/worklogs`, favorite);
  }

  // Update an existing favorite worklog
  updateFavoriteWorklog(id: string, favorite: FavoriteWorklog): Observable<FavoriteWorklog> {
    return this.http.put<FavoriteWorklog>(`${this.apiUrl}/favorites/worklogs/${id}`, favorite);
  }

  // Delete a favorite worklog
  deleteFavoriteWorklog(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/favorites/worklogs/${id}`);
  }

  // Get worklogs list for a date range
  getWorklogsList(from: string, to: string) {
    return this.http.get<WorklogEntry[]>(`${this.apiUrl}/worklogs/list?from=${from}&to=${to}`);
  }

  // Prefixes CRUD
  getPrefixes() {
    return this.http.get<any[]>(`${this.apiUrl}/prefixes`);
  }

  createPrefix(mapping: any) {
    return this.http.post<any>(`${this.apiUrl}/prefixes`, mapping);
  }

  updatePrefix(id: string, mapping: any) {
    return this.http.put<any>(`${this.apiUrl}/prefixes/${id}`, mapping);
  }

  deletePrefix(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/prefixes/${id}`);
  }

  // Enabled flag
  getPrefixesEnabled() {
    return this.http.get<boolean>(`${this.apiUrl}/prefixes/enabled`);
  }

  setPrefixesEnabled(enabled: boolean) {
    return this.http.put<void>(`${this.apiUrl}/prefixes/enabled`, enabled);
  }

  // Get constant prefixes from CSV-backed endpoint
  getConstantPrefixes() {
    return this.http.get<string[]>(`${this.apiUrl}/constant-prefixes`);
  }
}
