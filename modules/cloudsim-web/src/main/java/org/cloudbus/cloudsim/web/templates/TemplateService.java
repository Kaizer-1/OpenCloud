package org.cloudbus.cloudsim.web.templates;

import org.cloudbus.cloudsim.web.model.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class TemplateService {

    public record TemplateMeta(String id, String name, String description) {}

    public List<TemplateMeta> listTemplates() {
        return List.of(
                new TemplateMeta("example1", "Basic — 1 VM, 1 Cloudlet", "Simplest case: one datacenter, one host, one VM, one cloudlet"),
                new TemplateMeta("example2", "2 VMs, bound cloudlets", "Explicit VM-to-cloudlet binding"),
                new TemplateMeta("example3", "Heterogeneous VMs", "Two hosts with different MIPS, two VMs"),
                new TemplateMeta("example4", "Multi-datacenter", "Two datacenters, SpaceShared VM scheduler"),
                new TemplateMeta("example5", "Multi-broker", "Two datacenters, two VMs in separate runs"),
                new TemplateMeta("example6", "Scale — 20 VMs", "Bulk generation: 20 VMs, 40 cloudlets"),
                new TemplateMeta("example7", "Dynamic broker at t=200", "Pause/resume, quad+dual-core hosts"),
                new TemplateMeta("example8", "GlobalBroker", "Runtime broker creation, quad+dual-core hosts"),
                new TemplateMeta("example9", "Scheduler comparison", "TimeShared vs SpaceShared cloudlet scheduling"),
                new TemplateMeta("blank", "Custom (blank)", "Start from scratch")
        );
    }

    public SimulationConfigDto getTemplate(String id) {
        return switch (id) {
            case "example1" -> example1();
            case "example2" -> example2();
            case "example3" -> example3();
            case "example4" -> example4();
            case "example5" -> example5();
            case "example6" -> example6();
            case "example7" -> example7();
            case "example8" -> example8();
            case "example9" -> example9();
            case "blank"    -> blank();
            default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown template: " + id);
        };
    }

    // ── templates ─────────────────────────────────────────────────────────

    private SimulationConfigDto example1() {
        return new SimulationConfigDto("example1", "Example 1 — Basic",
                List.of(dc("Datacenter_0", List.of(host(1000, 1, 2048, 10000, 1000000, "TIME_SHARED")))),
                List.of(vm(1000, 1, 512, 1000, 10000, "TIME_SHARED")),
                List.of(cloudlet(400000, 1, 300, 300, null)),
                11.0, false);
    }

    private SimulationConfigDto example2() {
        return new SimulationConfigDto("example2", "Example 2 — 2 VMs bound",
                List.of(dc("Datacenter_0", List.of(host(1000, 1, 2048, 10000, 1000000, "TIME_SHARED")))),
                List.of(vm(1000, 1, 512, 1000, 10000, "TIME_SHARED"),
                        vm(1000, 1, 512, 1000, 10000, "TIME_SHARED")),
                List.of(cloudlet(400000, 1, 300, 300, 0),
                        cloudlet(400000, 1, 300, 300, 1)),
                11.0, false);
    }

    private SimulationConfigDto example3() {
        return new SimulationConfigDto("example3", "Example 3 — Heterogeneous VMs",
                List.of(dc("Datacenter_0", List.of(
                        host(1000, 1, 2048, 10000, 1000000, "TIME_SHARED"),
                        host(2000, 1, 2048, 10000, 1000000, "TIME_SHARED")))),
                List.of(vm(1000, 1, 512, 1000, 10000, "TIME_SHARED"),
                        vm(2000, 1, 512, 1000, 10000, "TIME_SHARED")),
                List.of(cloudlet(400000, 1, 300, 300, null),
                        cloudlet(400000, 1, 300, 300, null)),
                11.0, false);
    }

    private SimulationConfigDto example4() {
        return new SimulationConfigDto("example4", "Example 4 — Multi-datacenter",
                List.of(dc("Datacenter_0", List.of(host(1000, 1, 2048, 10000, 1000000, "SPACE_SHARED"))),
                        dc("Datacenter_1", List.of(host(1000, 1, 2048, 10000, 1000000, "SPACE_SHARED")))),
                List.of(vm(1000, 1, 512, 1000, 10000, "TIME_SHARED"),
                        vm(1000, 1, 512, 1000, 10000, "TIME_SHARED")),
                List.of(cloudlet(400000, 1, 300, 300, null),
                        cloudlet(400000, 1, 300, 300, null)),
                11.0, false);
    }

    private SimulationConfigDto example5() {
        return new SimulationConfigDto("example5", "Example 5 — Multi-broker (single broker version)",
                List.of(dc("Datacenter_0", List.of(host(1000, 1, 2048, 10000, 1000000, "TIME_SHARED"))),
                        dc("Datacenter_1", List.of(host(1000, 1, 2048, 10000, 1000000, "TIME_SHARED")))),
                List.of(vm(1000, 1, 512, 1000, 10000, "TIME_SHARED"),
                        vm(1000, 1, 512, 1000, 10000, "TIME_SHARED")),
                List.of(cloudlet(400000, 1, 300, 300, null),
                        cloudlet(400000, 1, 300, 300, null)),
                11.0, false);
    }

    private SimulationConfigDto example6() {
        // 2 DCs: first has 4 hosts (each quad-core 1000 MIPS), second has 2 hosts
        List<HostConfigDto> dc0Hosts = repeat(4, host(1000, 4, 2048, 10000, 1000000, "TIME_SHARED"));
        List<HostConfigDto> dc1Hosts = repeat(2, host(1000, 2, 2048, 10000, 1000000, "TIME_SHARED"));
        List<VmConfigDto>   vms      = repeat(20, vm(250, 1, 512, 1000, 10000, "TIME_SHARED"));
        List<CloudletConfigDto> cls  = repeat(40, cloudlet(40000, 1, 300, 300, null));
        return new SimulationConfigDto("example6", "Example 6 — Scale (20 VMs, 40 Cloudlets)",
                List.of(dc("Datacenter_0", dc0Hosts), dc("Datacenter_1", dc1Hosts)),
                vms, cls, 11.0, false);
    }

    private SimulationConfigDto example7() {
        // quad-core (4x250 MIPS) + dual-core (2x200 MIPS)
        List<HostConfigDto> dc0Hosts = repeat(2, host(250, 4, 2048, 10000, 1000000, "TIME_SHARED_OVERSUBSCRIPTION"));
        List<HostConfigDto> dc1Hosts = repeat(2, host(200, 2, 2048, 10000, 1000000, "TIME_SHARED_OVERSUBSCRIPTION"));
        List<VmConfigDto>   vms      = repeat(10, vm(250, 1, 512, 1000, 10000, "TIME_SHARED"));
        List<CloudletConfigDto> cls  = repeat(20, cloudlet(40000, 1, 300, 300, null));
        return new SimulationConfigDto("example7", "Example 7 — Pause/Resume (dynamic broker at t=200)",
                List.of(dc("Datacenter_0", dc0Hosts), dc("Datacenter_1", dc1Hosts)),
                vms, cls, 11.0, false);
    }

    private SimulationConfigDto example8() {
        List<HostConfigDto> dc0Hosts = repeat(2, host(250, 4, 2048, 10000, 1000000, "TIME_SHARED_OVERSUBSCRIPTION"));
        List<HostConfigDto> dc1Hosts = repeat(2, host(200, 2, 2048, 10000, 1000000, "TIME_SHARED_OVERSUBSCRIPTION"));
        List<VmConfigDto>   vms      = repeat(10, vm(250, 1, 512, 1000, 10000, "TIME_SHARED"));
        List<CloudletConfigDto> cls  = repeat(20, cloudlet(40000, 1, 300, 300, null));
        return new SimulationConfigDto("example8", "Example 8 — GlobalBroker",
                List.of(dc("Datacenter_0", dc0Hosts), dc("Datacenter_1", dc1Hosts)),
                vms, cls, 11.0, false);
    }

    private SimulationConfigDto example9() {
        // Two VMs: one TimeShared, one SpaceShared; 6 cloudlets
        return new SimulationConfigDto("example9", "Example 9 — Scheduler comparison",
                List.of(dc("Datacenter_0", List.of(
                        host(1000, 2, 2048, 10000, 1000000, "TIME_SHARED"),
                        host(1000, 2, 2048, 10000, 1000000, "SPACE_SHARED")))),
                List.of(vm(1000, 1, 512, 1000, 10000, "TIME_SHARED"),
                        vm(1000, 1, 512, 1000, 10000, "SPACE_SHARED")),
                List.of(
                        cloudlet(400000, 1, 300, 300, 0),
                        cloudlet(400000, 1, 300, 300, 0),
                        cloudlet(400000, 1, 300, 300, 0),
                        cloudlet(400000, 1, 300, 300, 1),
                        cloudlet(400000, 1, 300, 300, 1),
                        cloudlet(400000, 1, 300, 300, 1)),
                11.0, false);
    }

    private SimulationConfigDto blank() {
        return new SimulationConfigDto(null, "New Simulation",
                List.of(dc("Datacenter_0", List.of(host(1000, 1, 2048, 10000, 1000000, "TIME_SHARED")))),
                List.of(vm(1000, 1, 512, 1000, 10000, "TIME_SHARED")),
                List.of(cloudlet(400000, 1, 300, 300, null)),
                11.0, false);
    }

    // ── factory helpers ────────────────────────────────────────────────────

    private static DatacenterConfigDto dc(String name, List<HostConfigDto> hosts) {
        return new DatacenterConfigDto(name, "x86", "Linux", "Xen",
                10.0, 3.0, 0.05, 0.001, 0.0, 0.0,
                DatacenterConfigDto.VmAllocationPolicyType.SIMPLE, hosts);
    }

    private static HostConfigDto host(double mips, int pes, int ram, long bw, long storage, String sched) {
        return new HostConfigDto(mips, pes, ram, bw, storage,
                HostConfigDto.VmSchedulerType.valueOf(sched));
    }

    private static VmConfigDto vm(double mips, int pes, int ram, long bw, long size, String sched) {
        return new VmConfigDto(mips, pes, ram, bw, size, "Xen",
                VmConfigDto.CloudletSchedulerType.valueOf(sched));
    }

    private static CloudletConfigDto cloudlet(long length, int pes, long fs, long os, Integer vmId) {
        return new CloudletConfigDto(length, pes, fs, os,
                CloudletConfigDto.UtilizationModelType.FULL,
                CloudletConfigDto.UtilizationModelType.FULL,
                CloudletConfigDto.UtilizationModelType.FULL,
                vmId);
    }

    private static <T> List<T> repeat(int n, T item) {
        return java.util.Collections.nCopies(n, item);
    }
}
