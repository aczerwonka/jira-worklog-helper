package com.jiraworklog.worklog_backend.service;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import java.util.Base64;
import org.springframework.web.client.RestTemplate;

import com.jiraworklog.worklog_backend.dto.JiraIssueSummary;
import com.jiraworklog.worklog_backend.dto.JiraSearchResult;
import com.jiraworklog.worklog_backend.dto.JiraWorklogResponse;
import com.jiraworklog.worklog_backend.dto.WorklogRequest;
import com.jiraworklog.worklog_backend.dto.WorklogEntry;

@Service
public class JiraService {

    private final RestTemplate restTemplate;

    @Value("${jira.url:}")
    private String jiraUrl;

    @Value("${jira.token:}")
    private String jiraToken;

    public JiraService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (jiraToken != null && !jiraToken.isEmpty()) {
            headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + jiraToken);
        }
        headers.set("X-Atlassian-Token", "no-check");
        return headers;
    }

    public JiraWorklogResponse createWorklog(WorklogRequest request) {
        String url = jiraUrl + "/rest/api/2/issue/" + request.getTicketKey() + "/worklog";
        HttpHeaders headers = authHeaders();
        java.util.Map<String, Object> full = new java.util.HashMap<>();
        full.put("comment", request.getComment());
        full.put("timeSpentSeconds", request.getTimeSpentSeconds());
        // If the frontend provided a date (YYYY-MM-DD), set started to that date at 09:00 UTC offset format
        // If the frontend provided a full started timestamp, prefer it. Otherwise use the date if present.
        String startedValue = null;
        if (request.getStarted() != null && !request.getStarted().isBlank()) {
            startedValue = request.getStarted();
        } else if (request.getDate() != null && !request.getDate().isBlank()) {
            // default start time at 09:00 local-style timestamp (no milliseconds offset specified)
            startedValue = request.getDate() + "T09:00:00.000+0000";
        }
        full.put("started", startedValue);
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            // Jira may expect an author object; include minimal form
            full.put("author", java.util.Map.of("name", request.getUsername()));
        }
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(full, headers);
        ResponseEntity<Map> resp = restTemplate.exchange(URI.create(url), HttpMethod.POST, entity, Map.class);
        if (resp != null && resp.getBody() != null) {
            Map body = resp.getBody();
            JiraWorklogResponse out = new JiraWorklogResponse();
            out.setId(body.getOrDefault("id", null) == null ? null : body.get("id").toString());
            Object authorObj = body.get("author");
            if (authorObj instanceof Map) {
                Object name = ((Map) authorObj).get("displayName");
                if (name == null) name = ((Map) authorObj).get("name");
                out.setAuthor(name == null ? null : name.toString());
            }
            Object tss = body.get("timeSpentSeconds");
            if (tss instanceof Number) out.setTimeSpentSeconds(((Number) tss).intValue());
            Object started = body.get("started");
            out.setStarted(started == null ? null : started.toString());
            return out;
        }
        return null;
    }

    public JiraIssueSummary getIssueSummary(String key) {
        String url = jiraUrl + "/rest/api/2/issue/" + key + "?fields=summary";
        HttpHeaders headers = authHeaders();
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> resp = restTemplate.exchange(URI.create(url), HttpMethod.GET, entity, Map.class);
        if (resp != null && resp.getBody() != null) {
            Map body = resp.getBody();
            JiraIssueSummary out = new JiraIssueSummary();
            out.setId(body.getOrDefault("id", null) == null ? null : body.get("id").toString());
            out.setKey(body.getOrDefault("key", null) == null ? null : body.get("key").toString());
            Object fields = body.get("fields");
            if (fields instanceof Map) {
                Object summary = ((Map) fields).get("summary");
                out.setSummary(summary == null ? null : summary.toString());
            }
            return out;
        }
        return null;
    }

    public JiraSearchResult searchWorklogs(String jql) {
        String url = jiraUrl + "/rest/api/2/search?jql=" + jql;
        HttpHeaders headers = authHeaders();
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> resp = restTemplate.exchange(URI.create(url), HttpMethod.GET, entity, Map.class);
        JiraSearchResult result = new JiraSearchResult();
        if (resp != null && resp.getBody() != null) {
            Map body = resp.getBody();
            Object issues = body.get("issues");
            if (issues instanceof List) {
                List il = (List) issues;
                List<JiraIssueSummary> summaries = new ArrayList<>();
                for (Object o : il) {
                    if (o instanceof Map) {
                        Map im = (Map) o;
                        JiraIssueSummary item = new JiraIssueSummary();
                        item.setId(im.getOrDefault("id", null) == null ? null : im.get("id").toString());
                        item.setKey(im.getOrDefault("key", null) == null ? null : im.get("key").toString());
                        Object fields = im.get("fields");
                        if (fields instanceof Map) {
                            Object summary = ((Map) fields).get("summary");
                            item.setSummary(summary == null ? null : summary.toString());
                        }
                        summaries.add(item);
                    }
                }
                result.setIssues(summaries);
            }
        }
        return result;
    }

    public List<WorklogEntry> getWorklogsBetween(String fromDate, String toDate, String username) {
        List<WorklogEntry> out = new ArrayList<>();
        try {
            String jql = "worklogDate >= \"" + fromDate + "\" AND worklogDate <= \"" + toDate + "\"";
            if (username != null && !username.isBlank()) {
                jql += " AND worklogAuthor = \"" + username + "\"";
            }
            String enc = URLEncoder.encode(jql, StandardCharsets.UTF_8);
            JiraSearchResult sr = searchWorklogs(enc);
            if (sr != null && sr.getIssues() != null) {
                for (JiraIssueSummary issue : sr.getIssues()) {
                    String url = jiraUrl + "/rest/api/2/issue/" + issue.getKey() + "/worklog";
                    HttpHeaders headers = authHeaders();
                    HttpEntity<Void> entity = new HttpEntity<>(headers);
                    ResponseEntity<Map> resp = restTemplate.exchange(URI.create(url), HttpMethod.GET, entity, Map.class);
                    if (resp != null && resp.getBody() != null) {
                        Object worklogsObj = resp.getBody().get("worklogs");
                        if (worklogsObj instanceof List) {
                            for (Object w : (List) worklogsObj) {
                                if (w instanceof Map) {
                                    Map wm = (Map) w;
                                    Object authorObj = wm.get("author");
                                    boolean authored = false;
                                    if (authorObj instanceof Map) {
                                        Object name = ((Map) authorObj).get("name");
                                        Object displayName = ((Map) authorObj).get("displayName");
                                        if (username != null && !username.isBlank()) {
                                            if ((name != null && username.equals(name.toString())) || (displayName != null && username.equals(displayName.toString()))) {
                                                authored = true;
                                            }
                                        } else {
                                            authored = true;
                                        }
                                    }
                                    if (!authored) continue;
                                    Object started = wm.get("started");
                                    String startedStr = started == null ? null : started.toString();
                                    if (startedStr != null && startedStr.length() >= 10) {
                                        String datePart = startedStr.substring(0, 10);
                                        if (datePart.compareTo(fromDate) < 0 || datePart.compareTo(toDate) > 0) continue;
                                        Object tss = wm.get("timeSpentSeconds");
                                        int secs = 0;
                                        if (tss instanceof Number) secs = ((Number) tss).intValue();
                                        WorklogEntry we = new WorklogEntry();
                                        we.setDate(datePart);
                                        we.setTicketNumber(issue.getKey());
                                        we.setWorkTime(formatSeconds(secs));
                                        // copy Jira worklog comment/description if available
                                        Object commentObj = wm.get("comment");
                                        if (commentObj != null) {
                                            we.setComment(commentObj.toString());
                                        }
                                        out.add(we);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // swallow and return what we have; controller may handle empty result
        }
        return out;
    }

    private String formatSeconds(int secs) {
        if (secs <= 0) return "0 min";
        int hours = secs / 3600;
        int minutes = (secs % 3600) / 60;
        StringBuilder sb = new StringBuilder();
        if (hours > 0) {
            sb.append(hours).append(" godz.");
            if (minutes > 0) sb.append(" ");
        }
        if (minutes > 0) {
            sb.append(minutes).append(" min");
        }
        return sb.toString();
    }

}
