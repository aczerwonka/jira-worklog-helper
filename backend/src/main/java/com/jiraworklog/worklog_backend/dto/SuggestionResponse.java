package com.jiraworklog.worklog_backend.dto;

import java.util.List;

public class SuggestionResponse {
    private List<String> prefixes;

    public SuggestionResponse() {}

    public SuggestionResponse(List<String> prefixes) {
        this.prefixes = prefixes;
    }

    public List<String> getPrefixes() {
        return prefixes;
    }

    public void setPrefixes(List<String> prefixes) {
        this.prefixes = prefixes;
    }
}
