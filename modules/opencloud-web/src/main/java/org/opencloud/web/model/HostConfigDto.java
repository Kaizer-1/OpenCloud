package org.opencloud.web.model;

public record HostConfigDto(
        double mips,
        int numberOfPes,
        int ram,
        long bw,
        long storage,
        VmSchedulerType vmScheduler
) {
    public enum VmSchedulerType { TIME_SHARED, SPACE_SHARED, TIME_SHARED_OVERSUBSCRIPTION }
}
