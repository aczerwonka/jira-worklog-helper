package com.jiraworklog.worklog_backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.jiraworklog.worklog_backend.dto.PrefixMapping;

@Service
public class SuggestionService {

    private final CsvService csvService;
    private final PrefixesService prefixesService;

    public SuggestionService(CsvService csvService, PrefixesService prefixesService) {
        this.csvService = csvService;
        this.prefixesService = prefixesService;
    }

    public List<String> suggestPrefixes(String ticketKey, String baseComment) {
        List<String> suggestions = new ArrayList<>();
//        // load generic prefixes
//        suggestions.addAll(csvService.loadSuggestedPrefixes());
//
//        // heuristics: add mappings where defaultComment or type matches baseComment
//        String bc = baseComment == null ? "" : baseComment.toLowerCase(Locale.ROOT);
//        csvService.loadRulesMappings().forEach(map -> {
//            String type = map.get("type");
//            String prefix = map.get("prefix");
//            String defaultComment = map.get("defaultComment");
//            if (type != null && ticketKey != null && ticketKey.toUpperCase(Locale.ROOT).startsWith(type.toUpperCase(Locale.ROOT))) {
//                if (prefix != null && !suggestions.contains(prefix)) suggestions.add(prefix);
//            }
//            if (defaultComment != null && !defaultComment.isEmpty() && bc.contains(defaultComment.toLowerCase(Locale.ROOT))) {
//                if (prefix != null && !suggestions.contains(prefix)) suggestions.add(prefix);
//            }
//        });

        // include enabled prefix mappings from prefixes.csv
        try {
            List<PrefixMapping> pmList = prefixesService.getAllPrefixes();
            final String bc = baseComment == null ? "" : baseComment.toLowerCase(Locale.ROOT);
            if (pmList != null) {
                for (PrefixMapping pm : pmList) {
                    if (!pm.isEnabled()) continue;
                    String type = pm.getType();
                    String prefix = pm.getPrefix();
                    // Suggest when the entered text (baseComment) contains the mapping keyword (type)
                    if (type != null && !type.isBlank() && bc.contains(type.toLowerCase(Locale.ROOT))) {
                        if (prefix != null && !suggestions.contains(prefix)) suggestions.add(prefix);
                    }
                }
            }
        } catch (Exception e) {
            // ignore prefixes on error
        }

        // final cleanup: ensure unique and return
        List<String> unique = new ArrayList<>();
        for (String s : suggestions) if (s != null && !s.isBlank() && !unique.contains(s)) unique.add(s);
        return unique;
    }
}
