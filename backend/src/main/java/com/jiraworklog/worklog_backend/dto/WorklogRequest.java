package com.jiraworklog.worklog_backend.dto;

public class WorklogRequest {
    private String ticketKey;
    private Integer timeSpentSeconds;
    private String comment;
    private String username;
    private String date; // YYYY-MM-DD
    private String started; // optional full timestamp e.g. 2026-01-08T09:00:00+0100

    public String getTicketKey() {
        return ticketKey;
    }

    public void setTicketKey(String ticketKey) {
        this.ticketKey = ticketKey;
    }

    public Integer getTimeSpentSeconds() {
        return timeSpentSeconds;
    }

    public void setTimeSpentSeconds(Integer timeSpentSeconds) {
        this.timeSpentSeconds = timeSpentSeconds;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getStarted() {
        return started;
    }

    public void setStarted(String started) {
        this.started = started;
    }
}
