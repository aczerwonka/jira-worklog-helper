import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { WorklogService } from './services/worklog.service';
import { Worklog, FavoriteTicket, FavoriteWorklog, WorklogHistoryItem, JiraIssueSummary, WorklogEntry } from './models/worklog.model';
import { FavoritesComponent } from './favorites/favorites.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule, FavoritesComponent],
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
  // constant prefixes loaded from constant_prefixes.csv via backend
  constantPrefixes = signal<string[]>([]);
  // auto-deduced prefixes (from mappings/suggestions) — kept separate from manual constant prefixes
  autoPrefixes = signal<string[]>([]);
  // pełna lista prefixów (konfigurowalna, modal)
  prefixesList = signal<any[]>([]);
  prefixesEnabled = signal<boolean>(true);
  // aktywne prefixy na podstawie komentarza (auto) – tylko na bieżący formularz
  activePrefixes = signal<string[]>([]);
  // wyłączone (soft-delete) auto-prefixy dla aktualnego formularza – pomijane przy POST
  removedPrefixes = signal<string[]>([]);
  // stałe prefixy wybrane ręcznie (z constantPrefixes) – trwają pomiędzy POSTami
  selectedConstantPrefixes = signal<string[]>([]);
  // widoczność modala PREFIXES
  showPrefixesModal = signal<boolean>(false);
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

  private ticketInputDebounce: any = null;
  private commentInputDebounce: any = null;

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
    this.loadConstantPrefixes();
  }

  loadConstantPrefixes(): void {
    this.worklogService.getConstantPrefixes().subscribe({
      next: (data) => this.constantPrefixes.set(data || []),
      error: (err) => { console.error('Failed to load constant prefixes', err); this.constantPrefixes.set([]); }
    });
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

    // Trigger suggestion request even if ticketKey is empty — allow suggestions based on comment alone
    // Require at least some input (comment or ticketKey) to avoid empty requests
    const hasComment = typeof comment === 'string' && comment.trim().length > 0;
    const hasTicketKey = typeof ticketKey === 'string' && ticketKey.trim().length > 0;
    if (!hasComment && !hasTicketKey) return;

    this.worklogService.getSuggestedPrefixes({ ticketKey, baseComment: comment }).subscribe({
      next: (response) => this.suggestedPrefixes.set(response.prefixes),
      error: (err) => console.error('Error fetching suggestions', err),
    });
  }

  // add suggested prefix as active badge (dedupe)
  addPrefixToComment(prefix: string): void {
    if (!prefix) return;
    const list = this.activePrefixes();
    const removed = this.removedPrefixes();
    // jeżeli już jest aktywny, nic nie rób (auto-prefixy są tylko z jednego źródła)
    if (list.includes(prefix)) {
      return;
    }
    // jeżeli był oznaczony jako usunięty, zdejmij go z removed
    if (removed.includes(prefix)) {
      this.removedPrefixes.set(removed.filter(p => p !== prefix));
    }
    this.activePrefixes.set([...list, prefix]);
  }

  addActivePrefix(prefix: string): void {
    this.addPrefixToComment(prefix);
  }

  // Toggle constant prefix active state (for tags from constant_prefixes.csv)
  toggleConstantPrefix(prefix: string): void {
    if (!prefix) return;
    const selected = this.selectedConstantPrefixes();
    // jeśli już zaznaczony – wyłącz (usuń z listy wybranych)
    if (selected.includes(prefix)) {
      this.selectedConstantPrefixes.set(selected.filter(p => p !== prefix));
      return;
    }
    // jeśli nie zaznaczony – dodaj jako „na stałe” aktywny
    this.selectedConstantPrefixes.set([...selected, prefix]);
  }

  // soft toggle: mark prefix as removed (soft-delete) so it won't be included when saving; clicking again restores it
  removeActivePrefix(prefix: string): void {
    const removed = this.removedPrefixes();
    if (removed.includes(prefix)) {
      // restore
      this.removedPrefixes.set(removed.filter(p => p !== prefix));
    } else {
      // mark removed
      this.removedPrefixes.set([...removed, prefix]);
    }
  }

  // debounced handler for manual typing
  onTicketKeyInput(value: string): void {
    if (this.ticketInputDebounce) clearTimeout(this.ticketInputDebounce);
    this.ticketInputDebounce = setTimeout(() => {
      if (value && value.length > 2) {
        this.worklogService.getSuggestedPrefixes({ ticketKey: value, baseComment: this.worklogForm.get('comment')?.value }).subscribe({
          next: (response) => {
            const prefixes = response.prefixes || [];
            // lista sugerowanych prefixów z backendu (np. do przyszłego UI)
            this.suggestedPrefixes.set(prefixes);
            // zawsze zapisujemy auto-prefixy (pełne sugestie)
            this.autoPrefixes.set(prefixes);
            // aktywne auto-prefixy: zachowaj soft-usunięte (removedPrefixes) aby były widoczne jako nieaktywne
            const removed = this.removedPrefixes() || [];
            const union = Array.from(new Set([...prefixes, ...removed]));
            this.activePrefixes.set(union);
          },
          error: (err) => console.error('Error fetching suggestions', err),
        });
        this.fetchIssueSummary(value);
      }
    }, 300);
  }

  // debounced handler for typing in Activity Description textarea
  onCommentInput(value: string): void {
    if (this.commentInputDebounce) clearTimeout(this.commentInputDebounce);
    this.commentInputDebounce = setTimeout(() => {
      try {
        if (!this.prefixesEnabled()) return; // prefixes disabled
        const ticketKey = this.worklogForm.get('ticketKey')?.value;
        const baseComment = value || '';
        // only query suggestions when we have either ticketKey or some comment text
        const hasComment = typeof baseComment === 'string' && baseComment.trim().length > 0;
        const hasTicketKey = typeof ticketKey === 'string' && ticketKey.trim().length > 0;
        if (!hasComment && !hasTicketKey) return;
        this.worklogService.getSuggestedPrefixes({ ticketKey, baseComment }).subscribe({
          next: (resp) => {
            const prefixes = resp.prefixes || [];
            this.suggestedPrefixes.set(prefixes);
            // auto-prefixy wyznaczone na podstawie komentarza
            this.autoPrefixes.set(prefixes);
            // przy aktualizacji sugestii: zachowaj soft-usunięte prefixy tak, żeby były widoczne jako nieaktywne
            const removed = this.removedPrefixes() || [];
            const union = Array.from(new Set([...prefixes, ...removed]));
            this.activePrefixes.set(union);
          },
             error: (err) => { /* silent */ console.error('Error fetching suggestions from comment input', err); }
          });
       } catch (e) {
         // ignore
       }
    }, 100);
  }

  closePrefixesModal(): void {
    this.showPrefixesModal.set(false);
  }

  saveWorklog(): void {
    if (this.worklogForm.invalid) {
      // alert('Please fill in all required fields');
      this.showToast('Please fill in all required fields');
      return;
    }

    this.isLoadingSave.set(true);
    // Build explicit payload to ensure `date` is included and correctly formatted
    const form = this.worklogForm.value;
    // auto-prefixy (z komentarza) po odfiltrowaniu soft-deleted
    const active = this.activePrefixes() || [];
    const removed = this.removedPrefixes() || [];
    const autos = active.filter(p => !removed.includes(p));
    // stałe prefixy wybrane na stałe (nie resetujemy między POST)
    const manual = this.selectedConstantPrefixes() || [];
    const seen = new Set<string>();
    const combined: string[] = [];
    for (const p of manual) { if (p && !seen.has(p)) { seen.add(p); combined.push(p); } }
    for (const p of autos) { if (p && !seen.has(p)) { seen.add(p); combined.push(p); } }
    const prefixString = combined.map(p => `[${p}]`).join('');
    const finalComment = `${prefixString}${prefixString ? ' ' : ''}${(form.comment || '').trim()}`.trim();
    const payload: Worklog = {
      ticketKey: form.ticketKey,
      comment: finalComment,
      timeSpentSeconds: form.timeSpentSeconds,
      date: form.date,
      started: this.makeStartedTimestamp(form.date)
    };
    console.debug('Saving worklog payload:', payload);

    this.worklogService.createWorklog(payload).subscribe({
      next: (response) => {
        // alert('Worklog created successfully');
        this.showToast('Worklog created successfully');
        // preserve date and duration selected in the form (do not clear chosen date/time)
        const currentDateVal = this.worklogForm.get('date')?.value;
        const preservedHours = this.selectedHours();
        const preservedMinutes = this.selectedMinutes();
        this.worklogForm.reset();
        if (currentDateVal) {
          this.worklogForm.patchValue({ date: currentDateVal });
        }
        // restore duration signals and form seconds
        this.selectedHours.set(preservedHours ?? 0);
        this.selectedMinutes.set(preservedMinutes ?? 0);
        const restoredSeconds = (preservedHours ?? 0) * 3600 + (preservedMinutes ?? 0) * 60;
        this.worklogForm.patchValue({ timeSpentSeconds: restoredSeconds });
        this.selectedTicket.set('');
        this.selectedTicketSummary.set('');
        this.suggestedPrefixes.set([]);
        // po POST resetujemy auto-prefixy i ich soft-delete; stałe prefixy zostają
        this.activePrefixes.set([]);
        this.autoPrefixes.set([]);
        this.removedPrefixes.set([]);
         this.issueSummary.set(null);
         this.loadHistory();
         // odśwież kalendarz po zapisaniu nowego worklogu
         this.refreshCalendarAndWorklogs();
      },
      error: (err) => {
        console.error('Error saving worklog', err);
        // alert('Error saving worklog: ' + (err.error?.message || err.message));
        this.showToast('Error saving worklog: ' + (err.error?.message || err.message));
      },
      complete: () => this.isLoadingSave.set(false),
    });
  }

  // Simple toast implementation: shows a message in the bottom-right for a short time
  private toastTimer: any = null;
  showToast(message: string, timeoutMs: number = 2000): void {
    try {
      const container = document.getElementById('toast-container');
      if (!container) return;

      // create toast element
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.setAttribute('role', 'status');
      toast.style.background = '#111827';
      toast.style.color = '#fff';
      toast.style.padding = '10px 14px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 4px 12px rgba(2,6,23,0.2)';
      toast.style.maxWidth = '320px';
      toast.style.fontSize = '13px';
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 160ms ease-in-out, transform 160ms ease-in-out';
      toast.style.transform = 'translateY(8px)';

      container.appendChild(toast);

      // force reflow to enable transition
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      toast.offsetHeight;

      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';

      // remove after timeout
      const t = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => {
          try { container.removeChild(toast); } catch (e) { /* ignore */ }
        }, 180);
      }, timeoutMs);

      // keep reference to allow clearing if needed
      this.toastTimer = t;
    } catch (e) {
      // fallback to alert if DOM not available
      try { alert(message); } catch (_) { /* no-op */ }
    }
  }

  clearToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    const container = document.getElementById('toast-container');
    if (container) {
      container.innerHTML = '';
    }
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

  // Returns true when given date matches the date currently set in the form (YYYY-MM-DD)
  isFormDate(date: Date): boolean {
    try {
      const formDate = this.worklogForm?.get('date')?.value;
      if (!formDate) return false;
      return this.getDateString(date) === formDate;
    } catch (e) {
      return false;
    }
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
    if (ticket) {
      this.selectedTicket.set(ticket);
      // fetch latest issue summary for this ticket so the form shows up-to-date summary
      this.fetchIssueSummary(ticket);
    }
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

  openPrefixesModal(): void {
    this.showPrefixesModal.set(true);
    this.loadPrefixesList();
    this.loadPrefixesEnabled();
  }

  // prefix management UI state
  editingPrefix: any = null;
  addingPrefix: boolean = false;
  newPrefix: any = { type: '', prefix: '', label: '', enabled: true };

  loadPrefixesList(): void {
    this.worklogService.getPrefixes().subscribe({
      next: (data) => this.prefixesList.set(data || []),
      error: (err) => { console.error('Failed to load prefixes', err); this.prefixesList.set([]); }
    });
  }

  loadPrefixesEnabled(): void {
    this.worklogService.getPrefixesEnabled().subscribe({
      next: (flag) => this.prefixesEnabled.set(!!flag),
      error: (err) => { console.error('Failed to load prefixes enabled', err); this.prefixesEnabled.set(true); }
    });
  }

  togglePrefixesEnabled(): void {
    const oldVal = this.prefixesEnabled();
    const newVal = !oldVal;
    // optimistic UI update
    this.prefixesEnabled.set(newVal);
    this.worklogService.setPrefixesEnabled(newVal).subscribe({
      next: () => {
        // server accepted — nothing more to do (UI already updated)
      },
      error: (err) => {
        console.error('Failed to set prefixes enabled', err);
        // rollback optimistic change
        this.prefixesEnabled.set(oldVal);
        this.showToast('Failed to update prefixes enabled: ' + (err.error?.message || err.message));
      }
    });
  }

  startAddPrefix(): void {
    this.addingPrefix = true;
    this.newPrefix = { type: '', prefix: '', label: '', enabled: true };
  }

  cancelAdd(): void {
    this.addingPrefix = false;
    this.newPrefix = { type: '', prefix: '', label: '', enabled: true };
  }

  createPrefix(): void {
    const payload = { ...this.newPrefix };
    this.worklogService.createPrefix(payload).subscribe({
      next: (created) => {
        this.prefixesList.set([...(this.prefixesList() || []), created]);
        this.addingPrefix = false;
      },
      error: (err) => console.error('Failed to create prefix', err)
    });
  }

  editPrefix(p: any): void {
    // create shallow copy for editing
    this.editingPrefix = { ...p };
  }

  cancelEditing(): void {
    this.editingPrefix = null;
  }

  saveEditingPrefix(): void {
    if (!this.editingPrefix || !this.editingPrefix.id) return;
    this.worklogService.updatePrefix(this.editingPrefix.id, this.editingPrefix).subscribe({
      next: (updated) => {
        const list = (this.prefixesList() || []).map((x:any) => x.id === updated.id ? updated : x);
        this.prefixesList.set(list);
        this.editingPrefix = null;
      },
      error: (err) => console.error('Failed to update prefix', err)
    });
  }

  deletePrefix(p: any): void {
    if (!p || !p.id) return;
    this.worklogService.deletePrefix(p.id).subscribe({
      next: () => {
        this.prefixesList.set((this.prefixesList() || []).filter((x:any) => x.id !== p.id));
      },
      error: (err) => console.error('Failed to delete prefix', err)
    });
  }

  // set hours and update form seconds
  setHours(h: number): void {
    this.selectedHours.set(h);
    const mins = this.selectedMinutes();
    this.worklogForm.patchValue({ timeSpentSeconds: h * 3600 + mins * 60 });
  }

  // set minutes and update form seconds
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
}
