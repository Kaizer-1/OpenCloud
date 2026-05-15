package org.cloudbus.cloudsim.web.model;

public record CloudletConfigDto(
        long length,
        int numberOfPes,
        long fileSize,
        long outputSize,
        UtilizationModelType utilizationModelCpu,
        UtilizationModelType utilizationModelRam,
        UtilizationModelType utilizationModelBw,
        Integer assignedVmId
) {
    public enum UtilizationModelType { FULL, NULL, STOCHASTIC }
}
