package com.jiraworklog.worklog_backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestApiController {

    @Value("${jira.url:}")
    private String jiraUrl;

    @Value("${jira.token:}")
    private String jiraToken;

    @Value("${worklog.username:}")
    private String worklogUsername;

    @Value("${app.data-dir:./data}")
    private String appDataDir;

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> config() {
        Map<String, String> m = new HashMap<>();
        m.put("jira.url", jiraUrl != null ? jiraUrl : "");
        m.put("jira.token", jiraToken != null ? (jiraToken.isEmpty() ? "(empty)" : "(set)") : "");
        m.put("worklog.username", worklogUsername != null ? worklogUsername : "");
        m.put("app.data-dir", appDataDir != null ? appDataDir : "./data");
        return ResponseEntity.ok(m);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> m = new HashMap<>();
        m.put("status", "UP");
        return ResponseEntity.ok(m);
    }

    @GetMapping("/csv-sources")
    public ResponseEntity<Map<String, Object>> csvSources() {
        Map<String, Object> m = new HashMap<>();
        Path cwd = Paths.get(System.getProperty("user.dir"));
        Path dataDir = cwd.resolve(appDataDir);
        m.put("cwd", cwd.toAbsolutePath().toString());
        m.put("dataDir", dataDir.toAbsolutePath().toString());
        Map<String, Boolean> files = new HashMap<>();
        try {
            files.put("favorite_tickets.csv", Files.exists(dataDir.resolve("favorite_tickets.csv")));
            files.put("rules_mappings.csv", Files.exists(dataDir.resolve("rules_mappings.csv")));
            files.put("suggested_prefixes.csv", Files.exists(dataDir.resolve("suggested_prefixes.csv")));
        } catch (Exception e) {
            // ignore
        }
        m.put("files", files);
        return ResponseEntity.ok(m);
    }
}

