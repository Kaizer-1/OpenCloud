package org.opencloud.web.simulation;

import org.opencloud.web.model.SimulationConfigDto;

import java.util.List;

public record SimulationResultDto(
        long id,
        String name,
        String status,
        String createdAt,
        String completedAt,
        SimulationConfigDto config,
        SummaryDto summary,
        List<CloudletResultDto> cloudlets,
        String logs,
        boolean logsTruncated
) {
    public record SummaryDto(
            int totalCloudlets,
            int completedCloudlets,
            double makespan,
            double avgExecTime
    ) {}
}
