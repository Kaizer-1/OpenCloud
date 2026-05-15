package org.cloudbus.cloudsim.web.model;

import java.util.List;

public record DatacenterConfigDto(
        String name,
        String architecture,
        String os,
        String vmm,
        double timeZone,
        double costPerSec,
        double costPerMem,
        double costPerStorage,
        double costPerBw,
        double schedulingInterval,
        VmAllocationPolicyType vmAllocationPolicy,
        List<HostConfigDto> hosts
) {
    public enum VmAllocationPolicyType { SIMPLE, SIMPLER }
}
