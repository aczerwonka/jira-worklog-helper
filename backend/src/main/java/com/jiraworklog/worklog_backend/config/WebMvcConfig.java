package com.jiraworklog.worklog_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve files directly under /browser/** from classpath:/static/browser/
        registry.addResourceHandler("/browser/**")
                .addResourceLocations("classpath:/static/browser/");

        // Serve static frontend files from classpath:/static/browser/ at the application root
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/browser/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        } else {
                            // if resource does not exist, fall back to index.html so SPA router can handle the route
                            Resource index = location.createRelative("index.html");
                            return index.exists() && index.isReadable() ? index : null;
                        }
                    }
                });
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // optional: explicit mapping for root
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}
