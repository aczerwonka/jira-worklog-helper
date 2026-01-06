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
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.jiraworklog.worklog_backend.dto.PrefixMapping;

@Service
public class PrefixesService {

    private static final String PREFIXES_FILE = "data/prefixes.csv";
    private static final String PREFIXES_ENABLED_FILE = "data/prefixes_enabled.cfg";

    // Resolve file path robustly: check several likely locations relative to working directory
    private File resolveFile(String relativePath) {
        // candidates: relativePath, backend/relativePath, ../relativePath
        String[] candidates = new String[] {
            relativePath,
            "backend/" + relativePath,
            "../" + relativePath,
            "./" + relativePath
        };
        for (String cand : candidates) {
            File f = new File(cand);
            if (f.exists()) return f;
        }
        // fallback to the direct relative path file object
        return new File(relativePath);
    }

    public List<PrefixMapping> getAllPrefixes() {
        List<PrefixMapping> prefixes = new ArrayList<>();
        File file = resolveFile(PREFIXES_FILE);
        if (!file.exists()) return prefixes;

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] parts = parseCsvLine(line);
                if (parts.length >= 5) {
                    PrefixMapping pm = new PrefixMapping();
                    pm.setId(parts[0]);
                    pm.setType(parts[1]);
                    pm.setPrefix(parts[2]);
                    pm.setLabel(parts[3]);
                    pm.setEnabled(Boolean.parseBoolean(parts[4]));
                    prefixes.add(pm);
                }
            }
        } catch (IOException e) {
            // return empty on error
        }

        return prefixes;
    }

    public PrefixMapping addPrefix(PrefixMapping mapping) {
        List<PrefixMapping> all = getAllPrefixes();
        if (mapping.getId() == null || mapping.getId().isEmpty()) {
            mapping.setId(UUID.randomUUID().toString());
        }
        all.add(mapping);
        savePrefixes(all);
        return mapping;
    }

    public PrefixMapping updatePrefix(String id, PrefixMapping updated) {
        List<PrefixMapping> all = getAllPrefixes();
        boolean found = false;
        for (int i = 0; i < all.size(); i++) {
            if (all.get(i).getId().equals(id)) {
                updated.setId(id);
                all.set(i, updated);
                found = true;
                break;
            }
        }
        if (!found) throw new RuntimeException("Prefix not found: " + id);
        savePrefixes(all);
        return updated;
    }

    public void deletePrefix(String id) {
        List<PrefixMapping> all = getAllPrefixes();
        boolean removed = all.removeIf(p -> p.getId().equals(id));
        if (!removed) throw new RuntimeException("Prefix not found: " + id);
        savePrefixes(all);
    }

    private void savePrefixes(List<PrefixMapping> prefixes) {
        File file = resolveFile(PREFIXES_FILE);
        if (file.getParentFile() != null) file.getParentFile().mkdirs();

        try (BufferedWriter bw = new BufferedWriter(
                new OutputStreamWriter(new FileOutputStream(file), StandardCharsets.UTF_8))) {
            bw.write("# id,type,prefix,label,enabled");
            bw.newLine();
            for (PrefixMapping p : prefixes) {
                String line = String.format("%s,%s,%s,%s,%s",
                        p.getId(), p.getType(), p.getPrefix(), escapeCsv(p.getLabel()), Boolean.toString(p.isEnabled()));
                bw.write(line);
                bw.newLine();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to save prefixes", e);
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                fields.add(current.toString().trim());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        fields.add(current.toString().trim());
        return fields.toArray(new String[0]);
    }

    public boolean isPrefixesEnabled() {
        try {
            File f = resolveFile(PREFIXES_ENABLED_FILE);
            if (!f.exists()) return true;
            String content = Files.readString(f.toPath(), StandardCharsets.UTF_8).trim();
            return !content.equalsIgnoreCase("false");
        } catch (Exception e) {
            return true;
        }
    }

    public void setPrefixesEnabled(boolean enabled) {
        File f = resolveFile(PREFIXES_ENABLED_FILE);
        try {
            if (f.getParentFile() != null) f.getParentFile().mkdirs();
            try (BufferedWriter bw = new BufferedWriter(
                    new OutputStreamWriter(new FileOutputStream(f), StandardCharsets.UTF_8))) {
                bw.write(Boolean.toString(enabled));
                bw.newLine();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to write prefixes enabled flag", e);
        }
    }

    public List<String> getConstantPrefixes() {
        List<String> out = new ArrayList<>();
        File file = resolveFile("data/constant_prefixes.csv");
        if (!file.exists()) return out;
        try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                // expect single column per line
                // if CSV has commas, take first field
                String value = line;
                if (line.contains(",")) value = line.split(",")[0].trim();
                if (!value.isEmpty()) out.add(value);
            }
        } catch (IOException e) {
            // ignore and return empty
        }
        return out;
    }
}
