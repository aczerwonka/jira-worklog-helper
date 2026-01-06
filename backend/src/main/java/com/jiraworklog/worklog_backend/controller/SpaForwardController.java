package com.jiraworklog.worklog_backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import jakarta.servlet.http.HttpServletRequest;

@Controller
public class SpaForwardController {

    // Forward all non-API requests without a file extension to index.html
    @GetMapping({"/", "/{path:[^\\.]*}", "/**/{path:[^\\.]*}"})
    public String forward(HttpServletRequest request) {
        String uri = request.getRequestURI();
        // Do not forward API requests
        if (uri.startsWith("/api/")) {
            return null; // let API controllers handle it
        }
        // Resource handler exposes index.html at root, so forward to /index.html
        return "forward:/index.html";
    }
}
