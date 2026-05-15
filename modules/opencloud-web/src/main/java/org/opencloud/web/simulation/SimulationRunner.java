package org.opencloud.web.simulation;

import org.opencloud.Cloudlet;
import org.opencloud.DatacenterBroker;
import org.opencloud.Host;
import org.opencloud.Vm;
import org.opencloud.core.OpenCloud;
import org.opencloud.web.model.DatacenterConfigDto;
import org.opencloud.web.model.SimulationConfigDto;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class SimulationRunner {

    private static final int LOG_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

    private final SimulationMapper mapper;

    public SimulationRunner(SimulationMapper mapper) {
        this.mapper = mapper;
    }

    public record RunResult(List<CloudletResultDto> cloudlets, String logs, boolean logsTruncated) {}

    public RunResult run(SimulationConfigDto config) throws Exception {
        // Reset static ID counters before each simulation to start IDs from 0.
        Cloudlet.initialize();
        Vm.initialize();
        Host.initialize();

        PrintStream originalOut = System.out;
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        System.setOut(new PrintStream(bos, true, StandardCharsets.UTF_8));

        try {
            OpenCloud.init(1, Calendar.getInstance(), config.traceFlag());

            // Build datacenters (each registers itself with the CIS on construction)
            for (DatacenterConfigDto dcConfig : config.datacenters()) {
                List<Host> hostList = mapper.buildHosts(dcConfig);
                mapper.buildDatacenter(dcConfig, hostList);
            }

            // Create one broker for all VMs and cloudlets
            DatacenterBroker broker = new DatacenterBroker("Broker");
            int brokerId = broker.getId();

            // Build and submit VMs
            List<Vm> vmList = new ArrayList<>();
            for (int i = 0; i < config.vms().size(); i++) {
                vmList.add(mapper.buildVm(i, brokerId, config.vms().get(i)));
            }
            broker.submitGuestList(vmList);

            // Build and submit Cloudlets
            List<org.opencloud.Cloudlet> cloudletList = new ArrayList<>();
            for (int i = 0; i < config.cloudlets().size(); i++) {
                cloudletList.add(mapper.buildCloudlet(i, brokerId, config.cloudlets().get(i)));
            }
            broker.submitCloudletList(cloudletList);

            // Run
            OpenCloud.startSimulation();
            OpenCloud.stopSimulation();

            List<CloudletResultDto> results = broker.getCloudletReceivedList().stream()
                    .map(mapper::mapCloudletResult)
                    .collect(Collectors.toList());

            return buildRunResult(results, bos);

        } finally {
            System.setOut(originalOut);
        }
    }

    private RunResult buildRunResult(List<CloudletResultDto> results, ByteArrayOutputStream bos) {
        byte[] rawBytes = bos.toByteArray();
        boolean truncated = false;
        String logs;
        if (rawBytes.length > LOG_MAX_BYTES) {
            byte[] truncated_bytes = Arrays.copyOf(rawBytes, LOG_MAX_BYTES);
            logs = new String(truncated_bytes, StandardCharsets.UTF_8) + "\n[log truncated]";
            truncated = true;
        } else {
            logs = new String(rawBytes, StandardCharsets.UTF_8);
        }
        return new RunResult(results, logs, truncated);
    }
}
