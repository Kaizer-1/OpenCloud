package org.opencloud.web.simulation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.opencloud.web.model.SimulationConfigDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;

@Service
public class SimulationService {

    private final SimulationRunRepository repo;
    private final SimulationConfigValidator validator;
    private final SimulationRunner runner;
    private final ExecutorService simulationExecutor;
    private final ObjectMapper json;

    public SimulationService(SimulationRunRepository repo,
                              SimulationConfigValidator validator,
                              SimulationRunner runner,
                              ExecutorService simulationExecutor,
                              ObjectMapper json) {
        this.repo = repo;
        this.validator = validator;
        this.runner = runner;
        this.simulationExecutor = simulationExecutor;
        this.json = json;
    }

    public Map<String, Object> submit(SimulationConfigDto config, Long userId) {
        validator.validate(config);

        SimulationRun run = new SimulationRun();
        run.setUserId(userId);
        run.setName(config.name());
        run.setTemplateId(config.templateId());
        run.setStatus("QUEUED");
        run.setCreatedAt(Instant.now().toString());
        try {
            run.setConfigJson(json.writeValueAsString(config));
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid config: " + e.getMessage());
        }
        SimulationRun saved = repo.save(run);
        long runId = saved.getId();

        simulationExecutor.submit(() -> executeRun(runId, config));

        return Map.of("simulationId", runId, "status", "QUEUED");
    }

    private void executeRun(long runId, SimulationConfigDto config) {
        // Mark RUNNING
        SimulationRun r = repo.findById(runId).orElseThrow();
        r.setStatus("RUNNING");
        repo.save(r);

        try {
            SimulationRunner.RunResult result = runner.run(config);
            StoredResult stored = new StoredResult(result.cloudlets(), result.logsTruncated());

            SimulationRun r2 = repo.findById(runId).orElseThrow();
            r2.setStatus("COMPLETED");
            r2.setResultJson(json.writeValueAsString(stored));
            r2.setLogs(result.logs());
            r2.setCompletedAt(Instant.now().toString());
            repo.save(r2);

        } catch (Exception e) {
            SimulationRun r3 = repo.findById(runId).orElseThrow();
            r3.setStatus("FAILED");
            r3.setLogs("Simulation error: " + e.getMessage());
            r3.setCompletedAt(Instant.now().toString());
            repo.save(r3);
        }
    }

    public SimulationResultDto getResult(long runId, Long userId) {
        SimulationRun run = repo.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Simulation not found"));
        if (!run.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return toResultDto(run);
    }

    public List<SimulationSummaryDto> listForUser(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toSummaryDto)
                .toList();
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private SimulationResultDto toResultDto(SimulationRun run) {
        SimulationConfigDto config = parseConfig(run.getConfigJson());

        List<CloudletResultDto> cloudlets = Collections.emptyList();
        boolean logsTruncated = false;
        if ("COMPLETED".equals(run.getStatus()) && run.getResultJson() != null) {
            try {
                StoredResult stored = json.readValue(run.getResultJson(), StoredResult.class);
                cloudlets = stored.cloudlets();
                logsTruncated = stored.logsTruncated();
            } catch (JsonProcessingException ignored) {}
        }

        SimulationResultDto.SummaryDto summary = buildSummary(cloudlets);

        return new SimulationResultDto(
                run.getId(), run.getName(), run.getStatus(),
                run.getCreatedAt(), run.getCompletedAt(),
                config, summary, cloudlets,
                run.getLogs() != null ? run.getLogs() : "",
                logsTruncated
        );
    }

    private SimulationSummaryDto toSummaryDto(SimulationRun run) {
        List<CloudletResultDto> cloudlets = Collections.emptyList();
        if ("COMPLETED".equals(run.getStatus()) && run.getResultJson() != null) {
            try {
                StoredResult stored = json.readValue(run.getResultJson(), StoredResult.class);
                cloudlets = stored.cloudlets();
            } catch (JsonProcessingException ignored) {}
        }
        SimulationResultDto.SummaryDto summary = buildSummary(cloudlets);
        return new SimulationSummaryDto(
                run.getId(), run.getName(), run.getStatus(),
                run.getCreatedAt(), run.getTemplateId(),
                summary.totalCloudlets(), summary.completedCloudlets(), summary.makespan()
        );
    }

    private SimulationResultDto.SummaryDto buildSummary(List<CloudletResultDto> cloudlets) {
        if (cloudlets == null || cloudlets.isEmpty()) {
            return new SimulationResultDto.SummaryDto(0, 0, 0.0, 0.0);
        }
        int total = cloudlets.size();
        long done = cloudlets.stream().filter(c -> "SUCCESS".equals(c.status())).count();
        double makespan = cloudlets.stream()
                .filter(c -> "SUCCESS".equals(c.status()))
                .mapToDouble(CloudletResultDto::finishTime)
                .max().orElse(0.0);
        double avgExec = cloudlets.stream()
                .filter(c -> "SUCCESS".equals(c.status()))
                .mapToDouble(CloudletResultDto::execTime)
                .average().orElse(0.0);
        return new SimulationResultDto.SummaryDto(total, (int) done, makespan, avgExec);
    }

    private SimulationConfigDto parseConfig(String configJson) {
        if (configJson == null) return null;
        try {
            return json.readValue(configJson, SimulationConfigDto.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
