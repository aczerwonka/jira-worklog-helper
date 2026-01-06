package com.jiraworklog.worklog_backend.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class CsvService {

    public List<String[]> readCsv(String resourcePath) {
        List<String[]> rows = new ArrayList<>();
        try {
            ClassPathResource res = new ClassPathResource(resourcePath);
            if (!res.exists()) return rows;
        // Candidates: ./data/<filename>, ./<resourcePath>, ./<filename>
                 BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String filename = extractFilename(resourcePath);
            Path cwd = Paths.get(System.getProperty("user.dir"));
            Path candidate1 = cwd.resolve("data").resolve(filename);
            Path candidate2 = cwd.resolve(resourcePath);
            Path candidate3 = cwd.resolve(filename);

            if (Files.exists(candidate1)) {
                return readCsvFromPath(candidate1);
            } else if (Files.exists(candidate2)) {
                return readCsvFromPath(candidate2);
            } else if (Files.exists(candidate3)) {
                return readCsvFromPath(candidate3);
            }

            // Fallback to classpath
    public List<Map<String, String>> loadFavoriteTickets() {
        List<Map<String, String>> out = new ArrayList<>();
        List<String[]> rows = readCsv("static/favorite_tickets.csv");
        for (String[] r : rows) {
            if (r.length >= 3) {
                Map<String, String> m = new HashMap<>();
                m.put("id", r[0]);
                m.put("key", r[1]);
                m.put("label", r[2]);
                out.add(m);
            }
        }
        return out;
    }

    public List<Map<String, String>> loadRulesMappings() {
        List<Map<String, String>> out = new ArrayList<>();
        List<String[]> rows = readCsv("static/rules_mappings.csv");
        for (String[] r : rows) {
    private List<String[]> readCsvFromPath(Path p) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader br = Files.newBufferedReader(p, StandardCharsets.UTF_8)) {
            String line;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] parts = line.split(",");
                for (int i = 0; i < parts.length; i++) parts[i] = parts[i].trim();
                rows.add(parts);
            }
        }
        System.out.println("CsvService: loaded file from " + p.toAbsolutePath());
        return rows;
    }

    private String extractFilename(String resourcePath) {
        if (resourcePath == null) return "";
        String s = resourcePath.replace("\\", "/");
        int idx = s.lastIndexOf('/');
        if (idx >= 0 && idx < s.length() - 1) return s.substring(idx + 1);
        return s;
    }

