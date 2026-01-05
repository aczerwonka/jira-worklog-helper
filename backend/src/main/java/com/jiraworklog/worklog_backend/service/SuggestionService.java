package com.jiraworklog.worklog_backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

@Service
public class SuggestionService {

    private final CsvService csvService;

    public SuggestionService(CsvService csvService) {
        this.csvService = csvService;
    }

    public List<String> suggestPrefixes(String ticketKey, String baseComment) {
        List<String> suggestions = new ArrayList<>();
        // load generic prefixes
        suggestions.addAll(csvService.loadSuggestedPrefixes());

        // heuristics: add mappings where defaultComment or type matches baseComment
        String bc = baseComment == null ? "" : baseComment.toLowerCase(Locale.ROOT);
        csvService.loadRulesMappings().forEach(map -> {
            String type = map.get("type");
            String prefix = map.get("prefix");
            String defaultComment = map.get("defaultComment");
            if (type != null && ticketKey != null && ticketKey.toUpperCase(Locale.ROOT).startsWith(type.toUpperCase(Locale.ROOT))) {
                if (prefix != null && !suggestions.contains(prefix)) suggestions.add(prefix);
            }
            if (defaultComment != null && !defaultComment.isEmpty() && bc.contains(defaultComment.toLowerCase(Locale.ROOT))) {
                if (prefix != null && !suggestions.contains(prefix)) suggestions.add(prefix);
            }
        });

        // final cleanup: ensure unique and return
        List<String> unique = new ArrayList<>();
        for (String s : suggestions) if (s != null && !s.isBlank() && !unique.contains(s)) unique.add(s);
        return unique;
    }
}
