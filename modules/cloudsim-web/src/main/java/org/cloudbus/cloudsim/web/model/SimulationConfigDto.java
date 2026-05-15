package org.cloudbus.cloudsim.web.model;

import java.util.List;

public record SimulationConfigDto(
        String templateId,
        String name,
        List<DatacenterConfigDto> datacenters,
        List<VmConfigDto> vms,
        List<CloudletConfigDto> cloudlets,
        double simulationClock,
        boolean traceFlag
) {}
