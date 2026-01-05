Worklog Management System - GUI & API Specification
1. System Concept
A high-end, professional SaaS-style dashboard for tracking development time. The application consists of a persistent top navigation bar and a split-view main workspace.

Layout Architecture
Top Bar: Sticky header with navigation links, search, and user profile.
Left Column (70%): Interactive Calendar Workspace.
Modes: Day, Week, Month.
Function: Displays worklog entries as color-coded cards.
Right Column (30%): Action Panel (Creation Form).
Function: Sticky sidebar for quick data entry.
2. Frontend Component Specification (Angular)
Worklog Form (Action Panel)
The form must feel snappy and modern. Use Tailwind CSS and Angular Signals for state management.
Main Input: Large textarea for "Activity Description". Minimalist styling (borderless or subtle bottom border).
Ticket Field: Input field for Ticket Number (e.g., JIRA-123) with a prefix icon.
Prefix System: A "Tag Cloud" of quick-select chips (e.g., [Feature], [Bugfix], [Refactor], [Meeting]). Clicking a chip appends the text to the activity.
Duration Picker: A Segmented Control (Button Group) for fast selection: 15m, 30m, 1h, 2h, 4h, 8h.
Action: Primary "Save Worklog" button with a subtle scale-up animation on hover.
Calendar View (Workspace)
Day View: A vertical timeline showing gaps in the workday.
Week/Month View: Grid-based layout with "Activity Cards" showing [TicketID] - [Activity Summary].
Interactivity: Clicking an entry opens a "Quick Edit" modal.
3. API Contract (REST)
Base Path: /api/v1/worklogs
Method	Endpoint	Description
POST	/	Create a new worklog entry
GET	?start=...&end=...	Fetch worklogs for a specific date range
PUT	/{id}	Update an existing worklog
DELETE	/{id}	Remove a worklog entry
Example Request Body (POST)
JSON
{
  "ticketNumber": "PROJ-789",
  "activity": "Refactored the authentication service to use Interceptors",
  "tags": ["Refactor", "Security"],
  "durationMinutes": 60,
  "workDate": "2026-01-05"
}
4. UI/UX "Pro-Grade" Requirements (Copilot Prompt)
Markdown
Role: Senior Frontend Developer.
Task: Implement a professional Angular Dashboard.
Style: Clean, Enterprise SaaS (inspired by Linear.app or Vercel).

Design Guidelines:
1. Color Palette: Background #F8FAFC, Cards #FFFFFF, Primary Blue #3B82F6, Text #1E293B.
2. Typography: Use 'Inter' or 'Geist' sans-serif.
3. Shadows: Use subtle 'Soft UI' shadows instead of heavy borders.
4. Transitions: All hover states must have a 150ms ease-in-out transition.
5. Calendar: Use a CSS Grid layout. Each day cell should have a 'hover' state that reveals a '+' button to add worklog.

Component Logic:
- Use Angular Signals for reactive form state.
- Implement an 'Auto-Suggest' for Ticket Numbers based on previous entries.
- Ensure the 'Save' button has a 'loading' state while the API call is pending.