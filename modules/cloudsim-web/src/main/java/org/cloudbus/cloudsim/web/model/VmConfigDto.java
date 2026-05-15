package org.cloudbus.cloudsim.web.model;

public record VmConfigDto(
        double mips,
        int numberOfPes,
        int ram,
        long bw,
        long size,
        String vmm,
        CloudletSchedulerType cloudletScheduler
) {
    public enum CloudletSchedulerType { TIME_SHARED, SPACE_SHARED, DYNAMIC_WORKLOAD }
}
