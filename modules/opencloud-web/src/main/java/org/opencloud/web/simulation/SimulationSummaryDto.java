package org.opencloud.web.simulation;

public record SimulationSummaryDto(
        long id,
        String name,
        String status,
        String createdAt,
        String templateId,
        int totalCloudlets,
        int completedCloudlets,
        double makespan
) {}
