# Jira Worklog API Documentation

Base URL: `http://localhost:8080`

**Authentication**: All endpoints under `/api/**` require HTTP Basic Auth.

---

## Endpoints

### 1. Create Worklog
**POST** `/api/worklogs`

Creates a new worklog entry in Jira for a specific ticket.

**Request Body** (JSON):
```json
{
  "ticketKey": "DUM-1",
  "timeSpentSeconds": 3600,
  "comment": "[DEV] Implementation task",
  "username": "admin"
}
```

**Fields**:
- `ticketKey` (string, required): Jira issue key (e.g., "DUM-123")
- `timeSpentSeconds` (integer, required): Time spent in seconds
- `comment` (string, required): Worklog comment/description
- `username` (string, optional): Username to log the worklog as

**Response** (200 OK):
```json
{
  "id": "10000",
  "author": "admin",
  "timeSpentSeconds": 3600,
  "started": "2026-01-05T10:30:00.000+0000"
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Jira API error

---

### 2. Get Worklog History
**GET** `/api/worklogs/history`

Retrieves worklog history for the current user (or filtered by username).

**Query Parameters**:
- `days` (integer, optional, default: 7): Number of days to look back
- `username` (string, optional): Filter by specific username (Jira username format)

**Example Requests**:
```
GET /api/worklogs/history?days=7
GET /api/worklogs/history?days=14&username=arek
```

**Response** (200 OK):
```json
[
  {
    "ticketKey": "DUM-1",
    "summary": "Implement user authentication",
    "author": null,
    "timeSpentSeconds": null,
    "started": null
  },
  {
    "ticketKey": "DUM-2",
    "summary": "Fix login bug",
    "author": null,
    "timeSpentSeconds": null,
    "started": null
  }
]
```

**Fields**:
- `ticketKey` (string): Jira issue key
- `summary` (string): Issue summary/title
- `author` (string): Author of the worklog entry
- `timeSpentSeconds` (integer): Time spent in seconds
- `started` (string): ISO 8601 timestamp when work started

---

### 3. Get Issue Summary
**GET** `/api/jira/{key}/summary`

Fetches issue details from Jira (summary, ID, key).

**Path Parameters**:
- `key` (string, required): Jira issue key (e.g., "DUM-123")

**Example Requests**:
```
GET /api/jira/DUM-123/summary
GET /api/jira/PROJ-456/summary
```

**Response** (200 OK):
```json
{
  "id": "10000",
  "key": "DUM-123",
  "summary": "Implement new dashboard feature"
}
```

**Fields**:
- `id` (string): Internal Jira issue ID
- `key` (string): Issue key
- `summary` (string): Issue title/description

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
- `404 Not Found`: Issue not found in Jira
- `500 Internal Server Error`: Jira API error

---

### 4. Get Suggested Prefixes
**POST** `/api/suggestions/prefixes`

Returns a list of suggested prefix/comment combinations based on ticket key and base comment.

**Request Body** (JSON):
```json
{
  "ticketKey": "DEV-123",
  "baseComment": "Implementation"
}
```

**Fields**:
- `ticketKey` (string, required): Jira issue key
- `baseComment` (string, optional): Base comment/description for heuristic matching

**Response** (200 OK):
```json
{
  "prefixes": [
    "[DEV]",
    "[SCM]",
    "Daily",
    "Demo",
    "Refactor"
  ]
}
```

**Fields**:
- `prefixes` (array of strings): List of suggested prefixes/comments

---

### 5. Get Favorite Tickets
**GET** `/api/favorites`

Retrieves the list of favorite/pinned tickets from `favorite_tickets.csv`.

**Example Request**:
```
GET /api/favorites
```

**Response** (200 OK):
```json
[
  {
    "id": "1",
    "key": "DUM-123",
    "label": "Sprawy ogólne"
  },
  {
    "id": "2",
    "key": "DUM-456",
    "label": "Backend Tasks"
  }
]
```

**Fields**:
- `id` (string): Internal ID
- `key` (string): Jira issue key
- `label` (string): Display label for the ticket

---

### New: Get Worklogs (by date range)
**GET** `/api/worklogs/list`

Retrieves worklog entries for the configured user between two dates. This endpoint returns a flat list of worklog entries in a simple DTO used by the frontend.

**Query parameters**:
- `from` (string, required) — start date inclusive, format `YYYY-MM-DD`
- `to` (string, required) — end date inclusive, format `YYYY-MM-DD`

**Authentication**:
- Requires HTTP Basic Auth (same as other `/api/**` endpoints).

**Notes**:
- The endpoint uses the application configuration property `worklog.username` (in `application.properties`) as the username to filter worklogs. It does not currently accept a username parameter from the caller.
- Dates are compared using the date part of Jira's `started` field (first 10 characters of the timestamp). Time zones are not normalized — if you need timezone-aware behavior we can extend this later.
- The returned `workTime` is a human-friendly string (e.g., `2 godz. 30 min`).

**Example request (curl)**:
```bash
curl -u admin:admin \
  "http://localhost:8080/api/worklogs/list?from=2025-12-01&to=2025-12-07"
```

**Example response (200 OK)**:
```json
[
  {
    "date": "2025-12-01",
    "workTime": "2 godz. 30 min",
    "ticketNumber": "DUM-123"
  },
  {
    "date": "2025-12-02",
    "workTime": "1 godz.",
    "ticketNumber": "DUM-456"
  }
]
```

**Fields in response objects**:
- `date` (string): date of the worklog in `YYYY-MM-DD` format
- `workTime` (string): human-readable time spent (e.g., `1 godz. 15 min`)
- `ticketNumber` (string): Jira issue key

**Possible errors**:
- `400 Bad Request`: missing or malformed `from`/`to` parameters
- `401 Unauthorized`: invalid credentials
- `500 Internal Server Error`: error contacting Jira API or internal error

---

## Authentication

All endpoints under `/api/**` require HTTP Basic Authentication.

**Example**:
```bash
curl -u username:password -X GET http://localhost:8080/api/worklogs/history
```

In request headers:
```
Authorization: Basic <base64(username:password)>
```

---

## Configuration

Set the following properties in `application.properties` to connect to Jira:

```properties
jira.url=https://yourcompany.atlassian.net
jira.token=your_api_token_here
```

- `jira.url`: Base URL of your Jira instance
- `jira.token`: Jira API token (Bearer token for authentication to Jira)

---

## CSV Files (Backend Resources)

The backend reads configuration from CSV files in `src/main/resources/static/`:

### `favorite_tickets.csv`
Format: `id,key,label`
```
1,DUM-123,General Tasks
2,DUM-456,Backend Work
```

### `rules_mappings.csv`
Format: `type,prefix,defaultComment`
```
DEV,[DEV],Development
SCM,[SCM],Source Control
MEETING,[MEETING],Standup
```

### `suggested_prefixes.csv`
Format: One prefix per line
```
Daily
Demo
Refactor
Bug Fix
Code Review
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid input (missing fields, malformed JSON)
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error (often from Jira API)

Error response body (when applicable):
```json
{
  "error": "Description of the error",
  "status": 400
}
```

---

## Examples

### Create a worklog (curl)
```bash
curl -u admin:admin -X POST \
  -H "Content-Type: application/json" \
  -d '{"ticketKey":"DUM-1","timeSpentSeconds":3600,"comment":"[DEV] Task completed","username":"admin"}' \
  http://localhost:8080/api/worklogs
```

### Get history for last 14 days (curl)
```bash
curl -u admin:admin \
  "http://localhost:8080/api/worklogs/history?days=14&username=arek"
```

### Get issue summary (curl)
```bash
curl -u admin:admin \
  "http://localhost:8080/api/jira/DUM-123/summary"
```

### Get prefix suggestions (curl)
```bash
curl -u admin:admin -X POST \
  -H "Content-Type: application/json" \
  -d '{"ticketKey":"DEV-123","baseComment":"Implementation"}' \
  http://localhost:8080/api/suggestions/prefixes
```

### Get favorite tickets (curl)
```bash
curl -u admin:admin \
  "http://localhost:8080/api/favorites"
```

### Get worklogs by date range (curl)
```bash
curl -u admin:admin \
  "http://localhost:8080/api/worklogs/list?from=2025-12-01&to=2025-12-07"
```
