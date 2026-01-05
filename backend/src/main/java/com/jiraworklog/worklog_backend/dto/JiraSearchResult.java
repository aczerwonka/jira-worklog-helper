package com.jiraworklog.worklog_backend.dto;

import java.util.ArrayList;
import java.util.List;

public class JiraSearchResult {
    private List<JiraIssueSummary> issues = new ArrayList<>();

    public JiraSearchResult() {}

    public JiraSearchResult(List<JiraIssueSummary> issues) {
        this.issues = issues;
    }

    public List<JiraIssueSummary> getIssues() {
        return issues;
    }

    public void setIssues(List<JiraIssueSummary> issues) {
        this.issues = issues;
    }
}
