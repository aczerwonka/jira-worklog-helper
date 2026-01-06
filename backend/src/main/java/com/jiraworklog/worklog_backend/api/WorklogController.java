package com.jiraworklog.worklog_backend.api;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jiraworklog.worklog_backend.dto.SuggestionRequest;
import com.jiraworklog.worklog_backend.dto.SuggestionResponse;
import com.jiraworklog.worklog_backend.dto.WorklogHistoryItem;
import com.jiraworklog.worklog_backend.dto.WorklogRequest;
import com.jiraworklog.worklog_backend.dto.JiraIssueSummary;
import com.jiraworklog.worklog_backend.dto.JiraSearchResult;
import com.jiraworklog.worklog_backend.dto.JiraWorklogResponse;
import com.jiraworklog.worklog_backend.dto.WorklogEntry;
import com.jiraworklog.worklog_backend.dto.FavoriteWorklog;
import com.jiraworklog.worklog_backend.service.CsvService;
import com.jiraworklog.worklog_backend.service.JiraService;
import com.jiraworklog.worklog_backend.service.SuggestionService;
import com.jiraworklog.worklog_backend.service.FavoritesService;
import com.jiraworklog.worklog_backend.service.PrefixesService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
public class WorklogController {

    private static final Logger logger = LoggerFactory.getLogger(WorklogController.class);

    private final JiraService jiraService;
    private final SuggestionService suggestionService;
    private final CsvService csvService;
    private final FavoritesService favoritesService;
    private final PrefixesService prefixesService;

    @Value("${worklog.username:arek}")
    private String worklogUsername;

    public WorklogController(JiraService jiraService, SuggestionService suggestionService, 
                           CsvService csvService, FavoritesService favoritesService,
                           PrefixesService prefixesService) {
        this.jiraService = jiraService;
        this.suggestionService = suggestionService;
        this.csvService = csvService;
        this.favoritesService = favoritesService;
        this.prefixesService = prefixesService;
    }

    @PostMapping("/api/worklogs")
    public ResponseEntity<JiraWorklogResponse> createWorklog(@RequestBody WorklogRequest request) {
        // Log incoming date/started for debugging
        logger.info("Received createWorklog request - ticket={}, date={}, started={}", request.getTicketKey(), request.getDate(), request.getStarted());
        // Override username from request with configured username
        request.setUsername(worklogUsername);
        JiraWorklogResponse resp = jiraService.createWorklog(request);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/api/worklogs/history")
    public ResponseEntity<List<WorklogHistoryItem>> getHistory(@RequestParam(required = false, defaultValue = "7") int days) {
        // Use configured username, ignore parameter from frontend
        String username = worklogUsername;
        String jql = "worklogDate >= '-" + days + "d'";
        if (username != null && !username.isBlank()) {
            jql += " AND worklogAuthor = '" + username + "'";
        }
        String enc = URLEncoder.encode(jql, StandardCharsets.UTF_8);
        JiraSearchResult resp = jiraService.searchWorklogs(enc);
        // convert to WorklogHistoryItem
        List<WorklogHistoryItem> out = new ArrayList<>();
        if (resp != null && resp.getIssues() != null) {
            for (JiraIssueSummary i : resp.getIssues()) {
                WorklogHistoryItem item = new WorklogHistoryItem();
                item.setTicketKey(i.getKey());
                item.setSummary(i.getSummary());
                out.add(item);
            }
        }
        return ResponseEntity.ok(out);
    }

    @GetMapping("/api/jira/{key}/summary")
    public ResponseEntity<JiraIssueSummary> getIssueSummary(@PathVariable String key) {
        JiraIssueSummary resp = jiraService.getIssueSummary(key);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/api/suggestions/prefixes")
    public ResponseEntity<SuggestionResponse> suggestPrefixes(@RequestBody SuggestionRequest req) {
        List<String> prefixes = suggestionService.suggestPrefixes(req.getTicketKey(), req.getBaseComment());
        return ResponseEntity.ok(new SuggestionResponse(prefixes));
    }

    @GetMapping("/api/constant-prefixes")
    public ResponseEntity<List<String>> getConstantPrefixes() {
        return ResponseEntity.ok(prefixesService.getConstantPrefixes());
    }

    @GetMapping("/api/prefixes")
    public ResponseEntity<List<?>> getPrefixes() {
        return ResponseEntity.ok(prefixesService.getAllPrefixes());
    }

    @PostMapping("/api/prefixes")
    public ResponseEntity<com.jiraworklog.worklog_backend.dto.PrefixMapping> createPrefix(@RequestBody com.jiraworklog.worklog_backend.dto.PrefixMapping mapping) {
        com.jiraworklog.worklog_backend.dto.PrefixMapping created = prefixesService.addPrefix(mapping);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/api/prefixes/{id}")
    public ResponseEntity<com.jiraworklog.worklog_backend.dto.PrefixMapping> updatePrefix(@PathVariable String id, @RequestBody com.jiraworklog.worklog_backend.dto.PrefixMapping mapping) {
        com.jiraworklog.worklog_backend.dto.PrefixMapping updated = prefixesService.updatePrefix(id, mapping);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/api/prefixes/{id}")
    public ResponseEntity<Void> deletePrefix(@PathVariable String id) {
        prefixesService.deletePrefix(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/favorites")
    public ResponseEntity<?> getFavorites() {
        // Keep backward compatibility - return old CSV favorites
        return ResponseEntity.ok(csvService.loadFavoriteTickets());
    }

    @GetMapping("/api/favorites/worklogs")
    public ResponseEntity<List<FavoriteWorklog>> getFavoriteWorklogs() {
        return ResponseEntity.ok(favoritesService.getAllFavorites());
    }

    @PostMapping("/api/favorites/worklogs")
    public ResponseEntity<FavoriteWorklog> addFavoriteWorklog(@RequestBody FavoriteWorklog favorite) {
        FavoriteWorklog created = favoritesService.addFavorite(favorite);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/api/favorites/worklogs/{id}")
    public ResponseEntity<FavoriteWorklog> updateFavoriteWorklog(
            @PathVariable String id, @RequestBody FavoriteWorklog favorite) {
        FavoriteWorklog updated = favoritesService.updateFavorite(id, favorite);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/api/favorites/worklogs/{id}")
    public ResponseEntity<Void> deleteFavoriteWorklog(@PathVariable String id) {
        favoritesService.deleteFavorite(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/worklogs/list")
    public ResponseEntity<List<WorklogEntry>> getWorklogsBetween(@RequestParam String from, @RequestParam String to) {
        String username = worklogUsername;
        List<WorklogEntry> list = jiraService.getWorklogsBetween(from, to, username);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/api/prefixes/enabled")
    public ResponseEntity<Boolean> getPrefixesEnabled() {
        return ResponseEntity.ok(prefixesService.isPrefixesEnabled());
    }

//    @PutMapping("/api/prefixes/enabled")
//    public ResponseEntity<Void> setPrefixesEnabled(@RequestBody Boolean enabled) {
//        prefixesService.setPrefixesEnabled(enabled != null && enabled);
//        return ResponseEntity.ok().build();
//    }
}
