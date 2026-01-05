package com.jiraworklog.worklog_backend.dto;

public class JiraWorklogResponse {
    private String id;
    private String author;
    private Integer timeSpentSeconds;
    private String started;

    public JiraWorklogResponse() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public Integer getTimeSpentSeconds() {
        return timeSpentSeconds;
    }

    public void setTimeSpentSeconds(Integer timeSpentSeconds) {
        this.timeSpentSeconds = timeSpentSeconds;
    }

    public String getStarted() {
        return started;
    }

    public void setStarted(String started) {
        this.started = started;
    }
}
