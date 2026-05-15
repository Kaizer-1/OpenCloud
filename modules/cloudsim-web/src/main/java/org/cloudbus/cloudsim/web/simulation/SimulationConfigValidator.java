package org.cloudbus.cloudsim.web.simulation;

import org.cloudbus.cloudsim.web.model.DatacenterConfigDto;
import org.cloudbus.cloudsim.web.model.SimulationConfigDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SimulationConfigValidator {

    public void validate(SimulationConfigDto config) {
        if (config.name() == null || config.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Simulation name is required");
        }
        if (config.datacenters() == null || config.datacenters().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one datacenter is required");
        }
        if (config.datacenters().size() > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Simulation may not exceed 10 datacenters");
        }
        for (DatacenterConfigDto dc : config.datacenters()) {
            if (dc.hosts() == null || dc.hosts().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Datacenter '" + dc.name() + "' requires at least one host");
            }
            if (dc.hosts().size() > 20) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Datacenter '" + dc.name() + "' may not exceed 20 hosts");
            }
        }
        if (config.vms() == null || config.vms().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one VM is required");
        }
        if (config.vms().size() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Simulation may not exceed 100 VMs");
        }
        if (config.cloudlets() == null || config.cloudlets().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one cloudlet is required");
        }
        if (config.cloudlets().size() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Simulation may not exceed 1,000 cloudlets");
        }
    }
}
