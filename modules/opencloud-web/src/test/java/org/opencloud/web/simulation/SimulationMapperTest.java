package org.opencloud.web.simulation;

import org.opencloud.*;
import org.opencloud.core.OpenCloud;
import org.opencloud.web.model.*;
import org.junit.jupiter.api.*;

import java.util.Calendar;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SimulationMapperTest {

    private SimulationMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new SimulationMapper();
    }

    // ── Host ──────────────────────────────────────────────────────────────────

    @Test
    void buildHost_setsCorrectCapacities() {
        HostConfigDto cfg = new HostConfigDto(
                2000, 4, 4096, 20000, 500000,
                HostConfigDto.VmSchedulerType.TIME_SHARED);

        Host host = mapper.buildHost(0, cfg);

        assertEquals(4096, host.getRam(), "RAM");
        assertEquals(20000, host.getBw(), "BW");
        assertEquals(500000, host.getStorage(), "Storage");
        assertEquals(4, host.getPeList().size(), "PE count");
        assertEquals(2000, host.getPeList().get(0).getMips(), "MIPS per PE");
    }

    @Test
    void buildHost_spaceSharedScheduler_createsVmSchedulerSpaceShared() {
        HostConfigDto cfg = new HostConfigDto(
                1000, 2, 2048, 10000, 1000000,
                HostConfigDto.VmSchedulerType.SPACE_SHARED);

        Host host = mapper.buildHost(0, cfg);

        assertInstanceOf(VmSchedulerSpaceShared.class, host.getVmScheduler());
    }

    @Test
    void buildHosts_buildsOneHostPerEntry() {
        DatacenterConfigDto dc = new DatacenterConfigDto(
                "DC_0", "x86", "Linux", "Xen",
                10.0, 3.0, 0.05, 0.001, 0.0, 0.0,
                DatacenterConfigDto.VmAllocationPolicyType.SIMPLE,
                List.of(
                        new HostConfigDto(1000, 1, 2048, 10000, 1000000, HostConfigDto.VmSchedulerType.TIME_SHARED),
                        new HostConfigDto(2000, 2, 4096, 20000, 2000000, HostConfigDto.VmSchedulerType.SPACE_SHARED)
                ));

        List<Host> hosts = mapper.buildHosts(dc);

        assertEquals(2, hosts.size());
        assertEquals(0, hosts.get(0).getId());
        assertEquals(1, hosts.get(1).getId());
    }

    // ── VM ────────────────────────────────────────────────────────────────────

    @Test
    void buildVm_setsCorrectFields() {
        VmConfigDto cfg = new VmConfigDto(
                1000, 2, 512, 1000, 10000, "Xen",
                VmConfigDto.CloudletSchedulerType.TIME_SHARED);

        Vm vm = mapper.buildVm(3, 1, cfg);

        assertEquals(3, vm.getId(), "VM id");
        assertEquals(1, vm.getUserId(), "Broker id");
        assertEquals(1000, vm.getMips(), 0.001, "MIPS");
        assertEquals(2, vm.getNumberOfPes(), "PEs");
        assertEquals(512, vm.getRam(), "RAM");
        assertEquals(1000, vm.getBw(), "BW");
        assertEquals(10000, vm.getSize(), "Size");
        assertEquals("Xen", vm.getVmm(), "VMM");
    }

    @Test
    void buildVm_spaceSharedScheduler_createsCorrectScheduler() {
        VmConfigDto cfg = new VmConfigDto(
                500, 1, 256, 500, 5000, "Xen",
                VmConfigDto.CloudletSchedulerType.SPACE_SHARED);

        Vm vm = mapper.buildVm(0, 1, cfg);

        assertInstanceOf(CloudletSchedulerSpaceShared.class, vm.getCloudletScheduler());
    }

    // ── Cloudlet ──────────────────────────────────────────────────────────────

    @Test
    void buildCloudlet_setsCorrectFields() {
        CloudletConfigDto cfg = new CloudletConfigDto(
                400000, 1, 300, 300,
                CloudletConfigDto.UtilizationModelType.FULL,
                CloudletConfigDto.UtilizationModelType.FULL,
                CloudletConfigDto.UtilizationModelType.FULL,
                null);

        Cloudlet cl = mapper.buildCloudlet(0, 1, cfg);

        assertEquals(0, cl.getCloudletId(), "Cloudlet id");
        assertEquals(400000, cl.getCloudletLength(), "Length");
        assertEquals(1, cl.getNumberOfPes(), "PEs");
        assertEquals(300, cl.getCloudletFileSize(), "File size");
        assertEquals(300, cl.getCloudletOutputSize(), "Output size");
        assertInstanceOf(UtilizationModelFull.class, cl.getUtilizationModelCpu(), "CPU model");
    }

    @Test
    void buildCloudlet_withAssignedVm_setsGuestId() {
        CloudletConfigDto cfg = new CloudletConfigDto(
                100000, 1, 100, 100,
                CloudletConfigDto.UtilizationModelType.FULL,
                CloudletConfigDto.UtilizationModelType.NULL,
                CloudletConfigDto.UtilizationModelType.NULL,
                2);

        Cloudlet cl = mapper.buildCloudlet(0, 1, cfg);

        assertEquals(2, cl.getGuestId(), "Assigned VM id");
        assertInstanceOf(UtilizationModelNull.class, cl.getUtilizationModelRam(), "RAM model");
    }

    @Test
    void buildCloudlet_stochasticUtilization_createsCorrectModel() {
        CloudletConfigDto cfg = new CloudletConfigDto(
                50000, 1, 100, 100,
                CloudletConfigDto.UtilizationModelType.STOCHASTIC,
                CloudletConfigDto.UtilizationModelType.FULL,
                CloudletConfigDto.UtilizationModelType.FULL,
                null);

        Cloudlet cl = mapper.buildCloudlet(0, 1, cfg);

        assertInstanceOf(UtilizationModelStochastic.class, cl.getUtilizationModelCpu());
    }

    // ── Datacenter ────────────────────────────────────────────────────────────

    @Test
    void buildDatacenter_createsWithCorrectName() throws Exception {
        OpenCloud.init(1, Calendar.getInstance(), false);

        DatacenterConfigDto dc = new DatacenterConfigDto(
                "TestDC", "x86", "Linux", "Xen",
                10.0, 3.0, 0.05, 0.001, 0.0, 0.0,
                DatacenterConfigDto.VmAllocationPolicyType.SIMPLE,
                List.of(new HostConfigDto(1000, 1, 2048, 10000, 1000000, HostConfigDto.VmSchedulerType.TIME_SHARED)));

        List<Host> hosts = mapper.buildHosts(dc);
        Datacenter datacenter = mapper.buildDatacenter(dc, hosts);

        assertEquals("TestDC", datacenter.getName());
        assertEquals(1, mapper.buildHosts(dc).size());
    }
}
