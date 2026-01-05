package com.jiraworklog.worklog_backend.dto;

public class SuggestionRequest {
    private String ticketKey;
    private String baseComment;

    public String getTicketKey() {
        return ticketKey;
    }

    public void setTicketKey(String ticketKey) {
        this.ticketKey = ticketKey;
    }

    public String getBaseComment() {
        return baseComment;
    }

    public void setBaseComment(String baseComment) {
        this.baseComment = baseComment;
    }
}
