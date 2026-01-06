package com.jiraworklog.worklog_backend.service;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.jiraworklog.worklog_backend.dto.FavoriteWorklog;

@Service
public class FavoritesService {

    private static final String FAVORITES_FILE = "data/favorites.csv";
    private static final int MAX_FAVORITES = 10;

    public List<FavoriteWorklog> getAllFavorites() {
        List<FavoriteWorklog> favorites = new ArrayList<>();
        File file = new File(FAVORITES_FILE);
        
        if (!file.exists()) {
            return favorites;
        }

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                String[] parts = parseCsvLine(line);
                if (parts.length >= 4) {
                    FavoriteWorklog fav = new FavoriteWorklog();
                    fav.setId(parts[0]);
                    fav.setTicketKey(parts[1]);
                    fav.setComment(parts[2]);
                    try {
                        fav.setDefaultTimeMinutes(Integer.parseInt(parts[3]));
                    } catch (NumberFormatException e) {
                        fav.setDefaultTimeMinutes(30); // default
                    }
                    favorites.add(fav);
                }
            }
        } catch (IOException e) {
            // Return empty list on error
        }

        return favorites;
    }

    public FavoriteWorklog addFavorite(FavoriteWorklog favorite) {
        List<FavoriteWorklog> favorites = getAllFavorites();
        
        if (favorites.size() >= MAX_FAVORITES) {
            throw new RuntimeException("Maximum number of favorites (" + MAX_FAVORITES + ") reached");
        }

        if (favorite.getId() == null || favorite.getId().isEmpty()) {
            favorite.setId(UUID.randomUUID().toString());
        }

        favorites.add(favorite);
        saveFavorites(favorites);
        return favorite;
    }

    public FavoriteWorklog updateFavorite(String id, FavoriteWorklog updatedFavorite) {
        List<FavoriteWorklog> favorites = getAllFavorites();
        boolean found = false;

        for (int i = 0; i < favorites.size(); i++) {
            if (favorites.get(i).getId().equals(id)) {
                updatedFavorite.setId(id);
                favorites.set(i, updatedFavorite);
                found = true;
                break;
            }
        }

        if (!found) {
            throw new RuntimeException("Favorite not found with id: " + id);
        }

        saveFavorites(favorites);
        return updatedFavorite;
    }

    public void deleteFavorite(String id) {
        List<FavoriteWorklog> favorites = getAllFavorites();
        boolean removed = favorites.removeIf(f -> f.getId().equals(id));

        if (!removed) {
            throw new RuntimeException("Favorite not found with id: " + id);
        }

        saveFavorites(favorites);
    }

    private void saveFavorites(List<FavoriteWorklog> favorites) {
        File file = new File(FAVORITES_FILE);
        file.getParentFile().mkdirs();

        try (BufferedWriter bw = new BufferedWriter(
                new OutputStreamWriter(new FileOutputStream(file), StandardCharsets.UTF_8))) {
            bw.write("# id,ticketKey,comment,defaultTimeMinutes");
            bw.newLine();
            
            for (FavoriteWorklog fav : favorites) {
                String line = String.format("%s,%s,%s,%d",
                    fav.getId(),
                    fav.getTicketKey(),
                    escapeCsv(fav.getComment()),
                    fav.getDefaultTimeMinutes());
                bw.write(line);
                bw.newLine();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to save favorites", e);
        }
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;
        
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    // Escaped quote
                    currentField.append('"');
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                // Field separator
                fields.add(currentField.toString().trim());
                currentField = new StringBuilder();
            } else {
                currentField.append(c);
            }
        }
        
        // Add the last field
        fields.add(currentField.toString().trim());
        
        return fields.toArray(new String[0]);
    }
}
