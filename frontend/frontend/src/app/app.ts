import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { WorklogService } from './services/worklog.service';
import { Worklog, FavoriteTicket, FavoriteWorklog, WorklogHistoryItem, JiraIssueSummary, WorklogEntry } from './models/worklog.model';
import { FavoritesComponent } from './favorites/favorites.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FavoritesComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  providers: [WorklogService],
})
export class App implements OnInit {
  worklogForm!: FormGroup;

  // Signals for reactive state
  favorites = signal<FavoriteTicket[]>([]);
  history = signal<WorklogHistoryItem[]>([]);
  suggestedPrefixes = signal<string[]>([]);
  issueSummary = signal<JiraIssueSummary | null>(null);
  isLoadingSave = signal(false);
  isLoadingSummary = signal(false);

  selectedTicket = signal<string>('');
  selectedTicketSummary = signal<string>('');

  // Calendar signals
  calendarMode = signal<'day' | 'week' | 'month'>('month');
  currentDate = signal<Date>(new Date());
  calendarDays = signal<{ date: Date; worklogs: (WorklogHistoryItem | WorklogEntry)[] }[]>([]);

  // Duration options in minutes
  // Duration selection split into hours and minutes
  hourOptions = [0, 1, 2, 3, 4, 5, 6, 8];
  minuteOptions = [0, 15, 30, 45];

  // Backing signals for selected hour/minute
  selectedHours = signal<number>(1);
  selectedMinutes = signal<number>(0);

  // legacy/template compatibility: some templates may still reference durationOptions
  durationOptions: number[] = []; // kept empty to avoid rendering legacy single-list UI

  constructor(
    private fb: FormBuilder,
    private worklogService: WorklogService
  ) {
    this.initForm();
    // Build calendar immediately so Month view has data on first paint
    this.buildCalendar();

    // Rebuild calendar reactively when mode or date changes
    effect(() => {
      // track dependencies
      const _mode = this.calendarMode();
      const _date = this.currentDate();
      this.buildCalendar();
    });
  }

  ngOnInit() {
    this.loadFavorites();
    this.loadHistory();
    this.buildCalendar();
    // load full range for calendar
    this.loadCalendarWorklogsForCurrentView();
  }

  // Load worklogs for the currently visible calendar range
  private loadCalendarWorklogsForCurrentView(): void {
    const mode = this.calendarMode();
    let fromDate: string;
    let toDate: string;

    if (mode === 'month') {
      // compute first and last visible day in month grid
      const year = this.currentDate().getFullYear();
      const month = this.currentDate().getMonth();
      const firstDay = new Date(year, month, 1);
      const dow = firstDay.getDay();
      const mondayOffset = (dow + 6) % 7;
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - mondayOffset);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 41); // 42 days
      fromDate = this.formatLocalDate(startDate);
      toDate = this.formatLocalDate(endDate);
    } else if (mode === 'week') {
      const startDate = this.startOfWeekMonday(this.currentDate());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      fromDate = this.formatLocalDate(startDate);
      toDate = this.formatLocalDate(endDate);
    } else {
      fromDate = this.formatLocalDate(this.currentDate());
      toDate = fromDate;
    }

    // fetch from API and map to calendar days
    this.worklogService.getWorklogsList(fromDate, toDate).subscribe({
      next: (entries: WorklogEntry[]) => this.assignWorklogsToCalendar(entries),
      error: (err) => console.error('Error loading calendar worklogs', err),
    });
  }

  // Assigns WorklogEntry items to calendarDays by date
  private assignWorklogsToCalendar(entries: WorklogEntry[]): void {
    const days = this.calendarDays();
    const map: Record<string, WorklogEntry[]> = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    const newDays = days.map(d => {
      const dateStr = this.getDateString(d.date);
      const worklogs = (map[dateStr] || []).map(x => x as (WorklogHistoryItem | WorklogEntry));
      return { date: new Date(d.date), worklogs };
    });
    this.calendarDays.set(newDays);
  }

  private initForm(): void {
    const today = this.formatLocalDate(new Date());
    this.worklogForm = this.fb.group({
      ticketKey: ['', [Validators.required]],
      comment: ['', [Validators.required]],
      timeSpentSeconds: [3600, [Validators.required, Validators.min(60)]],
      date: [today, [Validators.required]],
    });
  }

  loadFavorites(): void {
    this.worklogService.getFavorites().subscribe({
      next: (data) => this.favorites.set(data),
      error: (err) => console.error('Error loading favorites', err),
    });
  }

  loadHistory(): void {
    this.worklogService.getHistory(7).subscribe({
      next: (data) => this.history.set(data),
      error: (err) => console.error('Error loading history', err),
    });
  }

  selectFavorite(ticket: FavoriteTicket): void {
    this.worklogForm.patchValue({ ticketKey: ticket.key });
    this.selectedTicket.set(ticket.key);
    this.selectedTicketSummary.set(ticket.label);
    this.fetchIssueSummary(ticket.key);
  }

  selectFavoriteWorklog(favorite: FavoriteWorklog): void {
    // Set ticket key
    this.worklogForm.patchValue({ ticketKey: favorite.ticketKey });
    this.selectedTicket.set(favorite.ticketKey);
    this.fetchIssueSummary(favorite.ticketKey);

    // Set comment
    this.worklogForm.patchValue({ comment: favorite.comment });

    // Set time (convert minutes to seconds)
    const timeInSeconds = favorite.defaultTimeMinutes * 60;
    this.worklogForm.patchValue({ timeSpentSeconds: timeInSeconds });

    // Update hour/minute signals
    const hours = Math.floor(favorite.defaultTimeMinutes / 60);
    const minutes = favorite.defaultTimeMinutes % 60;
    this.selectedHours.set(hours);
    this.selectedMinutes.set(minutes);
  }

  selectHistoryItem(item: WorklogHistoryItem): void {
    this.worklogForm.patchValue({ ticketKey: item.ticketKey });
    this.selectedTicket.set(item.ticketKey);
    this.selectedTicketSummary.set(item.summary);
    this.fetchIssueSummary(item.ticketKey);
  }

  onTicketKeyChange(key: string): void {
    this.selectedTicket.set(key);
    if (key && key.length > 2) {
      this.fetchIssueSummary(key);
    }
  }

  private fetchIssueSummary(key: string): void {
    this.isLoadingSummary.set(true);
    this.worklogService.getIssueSummary(key).subscribe({
      next: (summary) => {
        this.issueSummary.set(summary);
        this.selectedTicketSummary.set(summary.summary);
      },
      error: (err) => {
        console.error('Error fetching issue summary', err);
        this.issueSummary.set(null);
      },
      complete: () => this.isLoadingSummary.set(false),
    });
  }

  fetchSuggestedPrefixes(): void {
    const ticketKey = this.worklogForm.get('ticketKey')?.value;
    const comment = this.worklogForm.get('comment')?.value;

    if (ticketKey) {
      this.worklogService.getSuggestedPrefixes({ ticketKey, baseComment: comment }).subscribe({
        next: (response) => this.suggestedPrefixes.set(response.prefixes),
        error: (err) => console.error('Error fetching suggestions', err),
      });
    }
  }

  addPrefixToComment(prefix: string): void {
    const commentControl = this.worklogForm.get('comment');
    const currentValue = commentControl?.value || '';
    const newValue = currentValue ? `${currentValue} ${prefix}` : prefix;
    commentControl?.setValue(newValue);
  }

  setDuration(minutes: number): void {
    // kept for backward compatibility but prefer setHours/setMinutes
    const hrs = this.selectedHours();
    const mins = minutes;
    this.selectedMinutes.set(mins);
    this.worklogForm.patchValue({ timeSpentSeconds: hrs * 3600 + mins * 60 });
  }

  setHours(h: number): void {
    this.selectedHours.set(h);
    const mins = this.selectedMinutes();
    this.worklogForm.patchValue({ timeSpentSeconds: h * 3600 + mins * 60 });
  }

  setMinutes(m: number): void {
    this.selectedMinutes.set(m);
    const hrs = this.selectedHours();
    this.worklogForm.patchValue({ timeSpentSeconds: hrs * 3600 + m * 60 });
  }

  // --- Added compatibility wrappers used by the template ---
  setSelectedHour(hour: number): void {
    this.setHours(hour);
  }

  getSelectedHour(): number {
    return this.selectedHours();
  }

  setSelectedMinute(minute: number): void {
    this.setMinutes(minute);
  }

  getSelectedMinute(): number {
    return this.selectedMinutes();
  }
  // --- end wrappers ---

  saveWorklog(): void {
    if (this.worklogForm.invalid) {
      alert('Please fill in all required fields');
      return;
    }

    this.isLoadingSave.set(true);
    // Build explicit payload to ensure `date` is included and correctly formatted
    const form = this.worklogForm.value;
    const payload: Worklog = {
      ticketKey: form.ticketKey,
      comment: form.comment,
      timeSpentSeconds: form.timeSpentSeconds,
      date: form.date,
      started: this.makeStartedTimestamp(form.date)
    };
    console.debug('Saving worklog payload:', payload);

    this.worklogService.createWorklog(payload).subscribe({
      next: (response) => {
        alert('Worklog created successfully');
        this.worklogForm.reset();
        this.selectedTicket.set('');
        this.selectedTicketSummary.set('');
        this.suggestedPrefixes.set([]);
        this.issueSummary.set(null);
        this.loadHistory();
        // odśwież kalendarz po zapisaniu nowego worklogu
        this.refreshCalendarAndWorklogs();
      },
      error: (err) => {
        console.error('Error saving worklog', err);
        alert('Error saving worklog: ' + (err.error?.message || err.message));
      },
      complete: () => this.isLoadingSave.set(false),
    });
  }

  // Build a started timestamp from YYYY-MM-DD and local timezone offset
  private makeStartedTimestamp(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;
    // choose 09:00 local time as default
    const local = new Date(dateStr + 'T09:00:00');
    // timezone offset in minutes, note: getTimezoneOffset() returns minutes behind UTC (positive for zones behind UTC)
    const offsetMin = -local.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absOff = Math.abs(offsetMin);
    const offHours = String(Math.floor(absOff / 60)).padStart(2, '0');
    const offMins = String(absOff % 60).padStart(2, '0');
    // format: 2026-01-08T09:00:00.000+0100
    return `${dateStr}T09:00:00.000${sign}${offHours}${offMins}`;
  }

  getSelectedDuration(): number {
    const seconds = this.worklogForm.get('timeSpentSeconds')?.value || 0;
    return Math.round(seconds / 60);
  }

  // Calendar methods
  setCalendarMode(mode: 'day' | 'week' | 'month'): void {
    this.calendarMode.set(mode);
    this.buildCalendar();
  }

  nextPeriod(): void {
    const date = new Date(this.currentDate());
    const mode = this.calendarMode();
    if (mode === 'day') {
      date.setDate(date.getDate() + 1);
    } else if (mode === 'week') {
      date.setDate(date.getDate() + 7);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    this.currentDate.set(date);
    this.buildCalendar();
  }

  prevPeriod(): void {
    const date = new Date(this.currentDate());
    const mode = this.calendarMode();
    if (mode === 'day') {
      date.setDate(date.getDate() - 1);
    } else if (mode === 'week') {
      date.setDate(date.getDate() - 7);
    } else {
      date.setMonth(date.getMonth() - 1);
    }
    this.currentDate.set(date);
    this.buildCalendar();
  }

  private buildCalendar(): void {
    const mode = this.calendarMode();
    const days: { date: Date; worklogs: (WorklogHistoryItem | WorklogEntry)[] }[] = [];

    if (mode === 'month') {
      // Month view - 6 weeks x 7 days
      const year = this.currentDate().getFullYear();
      const month = this.currentDate().getMonth();
      const firstDay = new Date(year, month, 1);
      const dow = firstDay.getDay(); // 0..6 (Sun..Sat)
      const mondayOffset = (dow + 6) % 7;
      firstDay.setDate(firstDay.getDate() - mondayOffset);

      // Generate 42 days (6 weeks)
      for (let i = 0; i < 42; i++) {
        const date = new Date(firstDay);
        date.setDate(date.getDate() + i);
        const dateStr = this.getDateString(date);
        const worklogs: (WorklogHistoryItem | WorklogEntry)[] = [];
        days.push({ date: new Date(date), worklogs });
      }
    } else if (mode === 'week') {
      // Week view - 7 days (Monday start)
      const startDate = this.startOfWeekMonday(this.currentDate());
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const worklogs: (WorklogHistoryItem | WorklogEntry)[] = [];
        days.push({ date: new Date(date), worklogs });
      }
    } else {
      // Day view - single day
      const worklogs: (WorklogHistoryItem | WorklogEntry)[] = [];
      days.push({ date: new Date(this.currentDate()), worklogs });
    }

    this.calendarDays.set(days);
    // after building empty grid, fetch actual worklogs for visible range
    this.loadCalendarWorklogsForCurrentView();
  }

  // Ensure calendar reloads worklogs when mode or date changes
  private refreshCalendarAndWorklogs(): void {
    this.buildCalendar();
    this.loadCalendarWorklogsForCurrentView();
  }

  // Compute Monday as start of week
  private startOfWeekMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun,1=Mon,...
    const diff = (day + 6) % 7; // 0 for Mon, 6 for Sun
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Fallback for week view to ensure 7 visible columns
  getWeekDays(): { date: Date; worklogs: (WorklogHistoryItem | WorklogEntry)[] }[] {
    const days = this.calendarDays();
    if (this.calendarMode() !== 'week') {
      return days as { date: Date; worklogs: (WorklogHistoryItem | WorklogEntry)[] }[];
    }
    if (Array.isArray(days) && days.length === 7) {
      return days as { date: Date; worklogs: (WorklogHistoryItem | WorklogEntry)[] }[];
    }
    const startDate = this.startOfWeekMonday(this.currentDate());
    const fallback: { date: Date; worklogs: (WorklogHistoryItem | WorklogEntry)[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      fallback.push({ date: new Date(date), worklogs: [] });
    }
    return fallback;
  }

  private getDateString(date: Date): string {
    return this.formatLocalDate(date);
  }

  getMonthYear(): string {
    const date = this.currentDate();
    // force English locale
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  getWeekRange(): string {
    const start = this.startOfWeekMonday(this.currentDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    // force English locale for week range
    return `${start.toLocaleDateString('en-US')} - ${end.toLocaleDateString('en-US')}`;
  }

  // Format minutes into English human readable string, e.g. "2 hours 30 minutes" or "45 minutes"
  private formatMinutesToEnglish(totalMinutes: number): string {
    if (!totalMinutes || totalMinutes <= 0) return '';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(hours === 1 ? '1 hour' : `${hours} hours`);
    if (mins > 0) parts.push(mins === 1 ? '1 minute' : `${mins} minutes`);
    return parts.join(' ');
  }

  // Date handling methods
  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  setToday(): void {
    const today = this.formatLocalDate(new Date());
    this.worklogForm.patchValue({ date: today });
  }

  selectCalendarDate(date: Date): void {
    const dateStr = this.formatLocalDate(date);
    this.worklogForm.patchValue({ date: dateStr });
  }

  // Template helpers to safely extract fields from union types
  displayTicket(worklog: any): string {
    if (!worklog) return '';
    return worklog.ticketNumber || worklog.ticketKey || '';
  }

  displayWorkTime(worklog: any): string {
    if (!worklog) return '';
    // prefer to parse workTime and render in English
    if (worklog.workTime) {
      const mins = this.parseWorkTimeToMinutes(worklog.workTime);
      const formatted = this.formatMinutesToEnglish(mins);
      if (formatted) return formatted;
    }
    if (typeof worklog.timeSpentSeconds === 'number') {
      const mins = Math.round(worklog.timeSpentSeconds / 60);
      const formatted = this.formatMinutesToEnglish(mins);
      if (formatted) return formatted;
    }
    return '';
  }

  displaySummary(worklog: any): string {
    if (!worklog) return '';
    return worklog.summary || '';
  }

  // Parsuje pole workTime (różne warianty tekstowe) i zwraca liczbę minut
  private parseWorkTimeToMinutes(workTime: string | undefined | null): number {
    if (!workTime || typeof workTime !== 'string') return 0;
    let text = workTime.toLowerCase().trim();
    // normalize separators
    text = text.replace(',', '.');

    let totalMinutes = 0;

    // common patterns: "2 godz. 30 min", "2h 30m", "2.5h", "30m"
    // extract hours like "2h", "2 godz", "2.5h"
    const hourRegex = /(\d+(?:[\.,]\d+)?)\s*(h|godz|godz\.|hours?|hr)\b/;
    const minRegex = /(\d+)\s*(m|min|minut|mins?)\b/;

    const hourMatch = text.match(hourRegex);
    if (hourMatch) {
      const hoursStr = hourMatch[1].replace(',', '.');
      const hoursNum = parseFloat(hoursStr);
      if (!isNaN(hoursNum)) {
        totalMinutes += Math.round(hoursNum * 60);
      }
      // remove matched part so minutes can be parsed separately if present
      text = text.replace(hourMatch[0], '');
    }

    const minMatch = text.match(minRegex);
    if (minMatch) {
      const minsNum = parseInt(minMatch[1], 10);
      if (!isNaN(minsNum)) {
        totalMinutes += minsNum;
      }
      text = text.replace(minMatch[0], '');
    }

    // fallback: if no explicit h or m but a decimal number like "2.5" -> treat as hours
    if (totalMinutes === 0) {
      const decimalHours = text.match(/^(\d+(?:[\.,]\d+)?)/);
      if (decimalHours) {
        const val = parseFloat(decimalHours[1].replace(',', '.'));
        if (!isNaN(val)) totalMinutes = Math.round(val * 60);
      }
    }

    return totalMinutes;
  }

  // Fill the form from a clicked calendar worklog; do NOT change the date field
  fillFormFromWorklog(worklog: any): void {
    if (!worklog) return;

    const ticket = this.displayTicket(worklog);
    const summary = this.displaySummary(worklog);
    // Prefer comment/summary fields if present
    const comment = worklog.comment || summary || '';

    // Determine seconds: prefer numeric timeSpentSeconds, otherwise parse workTime
    let seconds = 0;
    if (typeof worklog.timeSpentSeconds === 'number') {
      seconds = worklog.timeSpentSeconds;
    } else if (worklog.workTime) {
      const mins = this.parseWorkTimeToMinutes(worklog.workTime);
      seconds = mins * 60;
    }

    // patch form without touching date
    this.worklogForm.patchValue({
      ticketKey: ticket,
      comment: comment,
      timeSpentSeconds: seconds || this.worklogForm.get('timeSpentSeconds')?.value,
    });

    // update signals for UI (ticket and summary)
    if (ticket) this.selectedTicket.set(ticket);
    if (summary) this.selectedTicketSummary.set(summary);

    // set hour/minute signals based on seconds
    const totalMinutes = Math.round((seconds || 0) / 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    this.selectedHours.set(hrs);
    this.selectedMinutes.set(mins);
  }

  // Sumuje pole workTime dla podanej listy worklogów i zwraca sformatowany string, np. "3h 15m" lub "45m"
  sumWorkTime(worklogs: any[] | undefined | null): string {
    if (!worklogs || !Array.isArray(worklogs) || worklogs.length === 0) return '';
    let totalMinutes = 0;
    for (const w of worklogs) {
      // używamy tylko pola workTime jak poproszono
      totalMinutes += this.parseWorkTimeToMinutes(w?.workTime);
    }
    if (totalMinutes <= 0) return '';
    return this.formatMinutesToEnglish(totalMinutes);
  }
}
