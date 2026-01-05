package com.jiraworklog.worklog_backend.dto;

public class WorklogHistoryItem {
    private String ticketKey;
    private String summary;
    private String author;
    private Integer timeSpentSeconds;
    private String started; // ISO date-time

    public String getTicketKey() {
        return ticketKey;
    }

    public void setTicketKey(String ticketKey) {
        this.ticketKey = ticketKey;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
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
