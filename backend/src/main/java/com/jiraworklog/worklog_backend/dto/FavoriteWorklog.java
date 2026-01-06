package com.jiraworklog.worklog_backend.dto;

public class FavoriteWorklog {
    private String id;
    private String ticketKey;
    private String comment;
    private int defaultTimeMinutes;

    public FavoriteWorklog() {
    }

    public FavoriteWorklog(String id, String ticketKey, String comment, int defaultTimeMinutes) {
        this.id = id;
        this.ticketKey = ticketKey;
        this.comment = comment;
        this.defaultTimeMinutes = defaultTimeMinutes;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTicketKey() {
        return ticketKey;
    }

    public void setTicketKey(String ticketKey) {
        this.ticketKey = ticketKey;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public int getDefaultTimeMinutes() {
        return defaultTimeMinutes;
    }

    public void setDefaultTimeMinutes(int defaultTimeMinutes) {
        this.defaultTimeMinutes = defaultTimeMinutes;
    }
}
