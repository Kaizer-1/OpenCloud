package org.opencloud.web.simulation;

import org.opencloud.*;
import org.opencloud.provisioners.BwProvisionerSimple;
import org.opencloud.provisioners.PeProvisionerSimple;
import org.opencloud.provisioners.RamProvisionerSimple;
import org.opencloud.web.model.*;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

@Component
public class SimulationMapper {

    public List<Host> buildHosts(DatacenterConfigDto dc) {
        List<Host> hostList = new ArrayList<>();
        for (int i = 0; i < dc.hosts().size(); i++) {
            hostList.add(buildHost(i, dc.hosts().get(i)));
        }
        return hostList;
    }

    public Host buildHost(int id, HostConfigDto hc) {
        List<Pe> peList = new ArrayList<>();
        for (int i = 0; i < hc.numberOfPes(); i++) {
            peList.add(new Pe(i, new PeProvisionerSimple(hc.mips())));
        }
        VmScheduler scheduler = buildVmScheduler(hc.vmScheduler(), peList);
        return new Host(id,
                new RamProvisionerSimple(hc.ram()),
                new BwProvisionerSimple(hc.bw()),
                hc.storage(),
                peList,
                scheduler);
    }

    public Datacenter buildDatacenter(DatacenterConfigDto dc, List<Host> hostList) throws Exception {
        String arch = dc.architecture() != null && !dc.architecture().isBlank() ? dc.architecture() : "x86";
        String os   = dc.os()           != null && !dc.os().isBlank()           ? dc.os()           : "Linux";
        String vmm  = dc.vmm()          != null && !dc.vmm().isBlank()          ? dc.vmm()          : "Xen";

        DatacenterCharacteristics chars = new DatacenterCharacteristics(
                arch, os, vmm, hostList,
                dc.timeZone(), dc.costPerSec(), dc.costPerMem(), dc.costPerStorage(), dc.costPerBw());

        VmAllocationPolicy policy = buildVmAllocationPolicy(dc.vmAllocationPolicy(), hostList);
        return new Datacenter(dc.name(), chars, policy, new LinkedList<>(), dc.schedulingInterval());
    }

    public Vm buildVm(int id, int brokerId, VmConfigDto vc) {
        String vmm = vc.vmm() != null && !vc.vmm().isBlank() ? vc.vmm() : "Xen";
        CloudletScheduler sched = buildCloudletScheduler(vc.cloudletScheduler(), vc.mips(), vc.numberOfPes());
        return new Vm(id, brokerId, vc.mips(), vc.numberOfPes(), vc.ram(), vc.bw(), vc.size(), vmm, sched);
    }

    public Cloudlet buildCloudlet(int id, int brokerId, CloudletConfigDto cc) {
        Cloudlet c = new Cloudlet(id, cc.length(), cc.numberOfPes(), cc.fileSize(), cc.outputSize(),
                utilModel(cc.utilizationModelCpu()),
                utilModel(cc.utilizationModelRam()),
                utilModel(cc.utilizationModelBw()));
        c.setUserId(brokerId);
        if (cc.assignedVmId() != null) {
            c.setGuestId(cc.assignedVmId());
        }
        return c;
    }

    public CloudletResultDto mapCloudletResult(Cloudlet c) {
        double actualCpuTime = c.getActualCPUTime();
        double cpuRate       = c.getCostPerSec();
        double bwCost        = c.getProcessingCost();
        double cpuCost       = cpuRate * actualCpuTime;
        return new CloudletResultDto(
                c.getCloudletId(),
                c.getStatus().name(),
                c.getResourceId(),
                c.getGuestId(),
                c.getSubmissionTime(),
                c.getExecStartTime(),
                c.getExecFinishTime(),
                actualCpuTime,
                c.getWaitingTime(),
                cpuRate,
                cpuCost,
                bwCost,
                cpuCost + bwCost
        );
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private VmAllocationPolicy buildVmAllocationPolicy(
            DatacenterConfigDto.VmAllocationPolicyType type, List<Host> hosts) {
        if (type == DatacenterConfigDto.VmAllocationPolicyType.SIMPLER) {
            return new VmAllocationPolicySimpler(hosts);
        }
        return new VmAllocationPolicySimple(hosts);
    }

    private VmScheduler buildVmScheduler(HostConfigDto.VmSchedulerType type, List<Pe> peList) {
        if (type == null) return new VmSchedulerTimeShared(peList);
        return switch (type) {
            case SPACE_SHARED -> new VmSchedulerSpaceShared(peList);
            case TIME_SHARED_OVERSUBSCRIPTION -> new VmSchedulerTimeSharedOverSubscription(peList);
            default -> new VmSchedulerTimeShared(peList);
        };
    }

    private CloudletScheduler buildCloudletScheduler(
            VmConfigDto.CloudletSchedulerType type, double mips, int pes) {
        if (type == null) return new CloudletSchedulerTimeShared();
        return switch (type) {
            case SPACE_SHARED -> new CloudletSchedulerSpaceShared();
            case DYNAMIC_WORKLOAD -> new CloudletSchedulerDynamicWorkload(mips, pes);
            default -> new CloudletSchedulerTimeShared();
        };
    }

    private UtilizationModel utilModel(CloudletConfigDto.UtilizationModelType type) {
        if (type == null) return new UtilizationModelFull();
        return switch (type) {
            case NULL -> new UtilizationModelNull();
            case STOCHASTIC -> new UtilizationModelStochastic();
            default -> new UtilizationModelFull();
        };
    }
}
