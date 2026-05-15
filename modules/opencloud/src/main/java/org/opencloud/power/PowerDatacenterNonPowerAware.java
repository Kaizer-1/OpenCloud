/*
 * Title:        OpenCloud Toolkit
 * Description:  OpenCloud (Cloud Simulation) Toolkit for Modeling and Simulation of Clouds
 * Licence:      GPL - http://www.gnu.org/copyleft/gpl.html
 *
 * Copyright (c) 2009-2012, The University of Melbourne, Australia
 */

package org.opencloud.power;

import java.util.List;
import java.util.Map;

import org.opencloud.DatacenterCharacteristics;
import org.opencloud.Log;
import org.opencloud.Storage;
import org.opencloud.Vm;
import org.opencloud.VmAllocationPolicy;
import org.opencloud.VmAllocationPolicy.GuestMapping;
import org.opencloud.core.CloudActionTags;
import org.opencloud.core.OpenCloud;
import org.opencloud.core.GuestEntity;
import org.opencloud.core.predicates.PredicateType;

/**
 * PowerDatacenterNonPowerAware is a class that represents a <b>non-power</b> aware data center in the
 * context of power-aware simulations.
 * 
 * <br/>If you are using any algorithms, policies or workload included in the power package please cite
 * the following paper:<br/>
 * 
 * <ul>
 * <li><a href="http://dx.doi.org/10.1002/cpe.1867">Anton Beloglazov, and Rajkumar Buyya, "Optimal Online Deterministic Algorithms and Adaptive
 * Heuristics for Energy and Performance Efficient Dynamic Consolidation of Virtual Machines in
 * Cloud Data Centers", Concurrency and Computation: Practice and Experience (CCPE), Volume 24,
 * Issue 13, Pages: 1397-1420, John Wiley &amp; Sons, Ltd, New York, USA, 2012</a>
 * </ul>
 * 
 * @author Anton Beloglazov
 * @since OpenCloud Toolkit 2.0
 */
public class PowerDatacenterNonPowerAware extends PowerDatacenter {

	/**
	 * Instantiates a new datacenter.
	 * 
	 * @param name the datacenter name
	 * @param characteristics the datacenter characteristics
	 * @param schedulingInterval the scheduling interval
	 * @param vmAllocationPolicy the vm provisioner
	 * @param storageList the storage list
	 * 
	 * @throws Exception the exception
	 */
	public PowerDatacenterNonPowerAware(
			String name,
			DatacenterCharacteristics characteristics,
			VmAllocationPolicy vmAllocationPolicy,
			List<Storage> storageList,
			double schedulingInterval) throws Exception {
		super(name, characteristics, vmAllocationPolicy, storageList, schedulingInterval);
	}

	@Override
	protected void updateCloudletProcessing() {
		if (getCloudletSubmitted() == -1 || getCloudletSubmitted() == OpenCloud.clock()) {
			OpenCloud.cancelAll(getId(), new PredicateType(CloudActionTags.VM_DATACENTER_EVENT));
			schedule(getId(), getSchedulingInterval(), CloudActionTags.VM_DATACENTER_EVENT);
			return;
		}
		double currentTime = OpenCloud.clock();
		double timeframePower = 0.0;

		if (currentTime > getLastProcessTime()) {
			double timeDiff = currentTime - getLastProcessTime();
			double minTime = Double.MAX_VALUE;

			Log.println("\n");

			for (PowerHost host : this.<PowerHost> getHostList()) {
				Log.formatLine("%.2f: Host #%d", OpenCloud.clock(), host.getId());

				double hostPower = 0.0;

				try {
					hostPower = host.getMaxPower() * timeDiff;
					timeframePower += hostPower;
				} catch (Exception e) {
					e.printStackTrace();
				}

				Log.formatLine(
						"%.2f: Host #%d utilization is %.2f%%",
						OpenCloud.clock(),
						host.getId(),
						host.getUtilizationOfCpu() * 100);
				Log.formatLine(
						"%.2f: Host #%d energy is %.2f W*sec",
						OpenCloud.clock(),
						host.getId(),
						hostPower);
			}

			Log.formatLine("\n%.2f: Consumed energy is %.2f W*sec\n", OpenCloud.clock(), timeframePower);

			Log.println("\n\n--------------------------------------------------------------\n\n");

			for (PowerHost host : this.<PowerHost> getHostList()) {
				Log.formatLine("\n%.2f: Host #%d", OpenCloud.clock(), host.getId());

				double time = host.updateCloudletsProcessing(currentTime); // inform VMs to update
																		// processing
				if (time < minTime) {
					minTime = time;
				}
			}

			setPower(getPower() + timeframePower);

			checkCloudletCompletion();

			/** Remove completed VMs **/
			for (PowerHost host : this.<PowerHost> getHostList()) {
				for (GuestEntity vm : host.getCompletedVms()) {
					getVmAllocationPolicy().deallocateHostForGuest(vm);
					getVmList().remove(vm);
					Log.println("VM #" + vm.getId() + " has been deallocated from host #" + host.getId());
				}
			}

			Log.println();

			if (!isDisableMigrations()) {
				List<GuestMapping> migrationMap = getVmAllocationPolicy().optimizeAllocation(
						getVmList());

				if (migrationMap != null) {
					for (GuestMapping migrate : migrationMap) {
						Vm vm = (Vm) migrate.vm();
						PowerHost targetHost = (PowerHost) migrate.host();
						PowerHost oldHost = (PowerHost) vm.getHost();

						if (oldHost == null) {
							Log.formatLine(
									"%.2f: Migration of VM #%d to Host #%d is started",
									OpenCloud.clock(),
									vm.getId(),
									targetHost.getId());
						} else {
							Log.formatLine(
									"%.2f: Migration of VM #%d from Host #%d to Host #%d is started",
									OpenCloud.clock(),
									vm.getId(),
									oldHost.getId(),
									targetHost.getId());
						}

						targetHost.addMigratingInGuest(vm);
						incrementMigrationCount();

						/** VM migration delay = RAM / bandwidth + C (C = 10 sec) **/
						send(
								getId(),
								vm.getRam() / ((double) vm.getBw() / 8000) + 10,
								CloudActionTags.VM_MIGRATE,
								migrate);
					}
				}
			}

			// schedules an event to the next time
			if (minTime != Double.MAX_VALUE) {
				OpenCloud.cancelAll(getId(), new PredicateType(CloudActionTags.VM_DATACENTER_EVENT));
				// OpenCloud.cancelAll(getId(), OpenCloud.SIM_ANY);
				send(getId(), getSchedulingInterval(), CloudActionTags.VM_DATACENTER_EVENT);
			}

			setLastProcessTime(currentTime);
		}
	}

}
