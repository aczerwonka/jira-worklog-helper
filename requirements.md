# Dokumentacja Wymagań: Jira Time Tracker PWA

## 1. Architektura i Dane
- **Lokalizacja:** `/frontend` (Angular), `/backend` (Spring Boot).
- **Persystencja:** Pliki CSV w `/backend/resources/`:
    - `favorite_tickets.csv`: Lista ulubionych/stałych ticketów (id, key, label).
    - `rules_mappings.csv`: Mapowanie typu pracy na prefix i domyślny komentarz (np. SCM -> [SCM], Spotkania).
    - `suggested_prefixes.csv`: Lista szybkich dopisków (Daily, Demo, Refactor).

---

## 2. Przypadki Użycia (Flow Logowania)

### UC1: Wybór Ticketu (Punkt Wyjścia)
Użytkownik ma trzy drogi wyboru ticketu przed wpisaniem czasu:
1. **Lista Ulubionych:** Kliknięcie w kafelek z `favorite_tickets.csv` (np. "DUM-123 - Sprawy ogólne").
2. **Ostatnie (Recents):** Lista pobrana z Jiry (JQL `worklogDate >= '-7d'`), sortowana po najnowszych ID.
3. **Ręczny wpis:** Autocomplete z Jiry. Po wpisaniu klucza, system wyświetla pod spodem `summary` zadania (UC5).

### UC2: Wybór Kontekstu (Prefix + Komentarz)
Po wybraniu ticketu, użytkownik wybiera rodzaj pracy (z mapowania):
1. **Wybór Typu:** np. klika "SCM".
2. **Logika Prefiksu:** System automatycznie ustawia prefix `[SCM]` i podpowiada "Spotkania".
3. **Doprecyzowanie:** Użytkownik wybiera z listy podpowiedzi (np. "Daily") lub wpisuje własny tekst.
4. **Finalny string:** `[SCM] Spotkania: Daily`.

### UC3: Logowanie Dedykowane
1. Wybór ticketu z JQL (np. zadanie programistyczne DUM-777).
2. Wybór typu "DEV" -> system dodaje prefix `[DEV]`.
3. Wysłanie worklogu do Jiry.

---

## 3. Komponenty Techniczne

### Backend (Spring Boot)
- **CSV Storage:** Zarządzanie `favorite_tickets.csv` (dodawanie/usuwanie z poziomu UI).
- **Jira Service:**
    - `POST /rest/api/2/issue/{key}/worklog` (Basic/Bearer Auth + `X-Atlassian-Token: no-check`).
    - `GET /rest/api/2/search?jql=...` (pobieranie historii i unikalnych ticketów).
    - `GET /rest/api/2/issue/{key}?fields=summary` (szybki podgląd nazwy zadania).

### Frontend (Angular)
- **Smart Form:** Reactive Forms z dynamicznie zmieniającymi się podpowiedziami w zależności od wybranego ticketu.
- **Calendar:** FullCalendar wyświetlający pobrane dane z Jiry jako eventy.
- **PWA:** Obsługa offline dla listy ulubionych ticketów (cache w LocalStorage/IndexedDB).