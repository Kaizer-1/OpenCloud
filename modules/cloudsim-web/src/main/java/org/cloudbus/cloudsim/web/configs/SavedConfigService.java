package org.cloudbus.cloudsim.web.configs;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.cloudbus.cloudsim.web.model.SimulationConfigDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class SavedConfigService {

    private final SavedConfigRepository repo;
    private final ObjectMapper mapper;

    public SavedConfigService(SavedConfigRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    public record ConfigMeta(long id, String name, String createdAt) {}

    public ConfigMeta save(SimulationConfigDto config, Long userId) {
        try {
            SavedConfig entity = new SavedConfig();
            entity.setUserId(userId);
            entity.setName(config.name() != null && !config.name().isBlank() ? config.name() : "Untitled");
            entity.setConfigJson(mapper.writeValueAsString(config));
            entity.setCreatedAt(Instant.now().toString());
            SavedConfig saved = repo.save(entity);
            return new ConfigMeta(saved.getId(), saved.getName(), saved.getCreatedAt());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save config");
        }
    }

    public List<ConfigMeta> list(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(c -> new ConfigMeta(c.getId(), c.getName(), c.getCreatedAt()))
                .toList();
    }

    public SimulationConfigDto get(long id, Long userId) {
        SavedConfig entity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Config not found"));
        if (!entity.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        try {
            return mapper.readValue(entity.getConfigJson(), SimulationConfigDto.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse config");
        }
    }

    public void delete(long id, Long userId) {
        SavedConfig entity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Config not found"));
        if (!entity.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        repo.delete(entity);
    }
}
