package org.opencloud.EX.disk;

import org.opencloud.Pe;
import org.opencloud.VmScheduler;
import org.opencloud.VmSchedulerTimeSharedOverSubscription;
import org.opencloud.core.GuestEntity;
import org.opencloud.EX.VmSchedulerWithIndependentPes;

import java.util.List;

/**
 * 
 * Schedules harddisks between VMs on a host.
 * 
 * @author nikolay.grozev
 * 
 */
public class VmDiskScheduler extends VmSchedulerWithIndependentPes<HddPe> {

    public VmDiskScheduler(final List<HddPe> pelist) {
        super(pelist);
    }

    @Override
    protected VmScheduler createSchedulerFroPe(final HddPe pe) {
        return new VmSchedulerTimeSharedOverSubscription(List.of(pe));
    }

    @Override
    protected boolean doesVmUse(final GuestEntity guest, final Pe pe) {
        return guest instanceof HddVm && ((HddVm) guest).getHddsIds().contains(pe.getId());
    }

}
