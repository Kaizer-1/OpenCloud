package org.cloudbus.cloudsim.web.simulation;

public record CloudletResultDto(
        int id,
        String status,
        int datacenterId,
        int vmId,
        double submissionTime,
        double startTime,
        double finishTime,
        double execTime,
        double waitingTime,
        double cpuCostRate,
        double cpuCost,
        double bwCost,
        double totalCost
) {}
