package com.jiraworklog.worklog_backend.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
            try (InputStream is = res.getInputStream();
                 BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) continue;
                    String[] parts = line.split(",");
                    for (int i = 0; i < parts.length; i++) parts[i] = parts[i].trim();
                    rows.add(parts);
                }
            }
        } catch (IOException e) {
            // ignore or log
        }
        return rows;
    }

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
            if (r.length >= 3) {
                Map<String, String> m = new HashMap<>();
                m.put("type", r[0]);
                m.put("prefix", r[1]);
                m.put("defaultComment", r[2]);
                out.add(m);
            }
        }
        return out;
    }

    public List<String> loadSuggestedPrefixes() {
        List<String> out = new ArrayList<>();
        List<String[]> rows = readCsv("static/suggested_prefixes.csv");
        for (String[] r : rows) {
            if (r.length >= 1) out.add(r[0]);
        }
        return out;
    }
}
