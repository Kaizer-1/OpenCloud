/*
 * Title:        OpenCloud Toolkit
 * Description:  OpenCloud (Cloud Simulation) Toolkit for Modeling and Simulation of Clouds
 * Licence:      GPL - http://www.gnu.org/copyleft/gpl.html
 *
 * Copyright (c) 2009-2012, The University of Melbourne, Australia
 */

package org.opencloud;

import org.opencloud.core.GuestEntity;
import org.opencloud.core.HostEntity;

import java.util.List;

/**
 * The most barebone implementation of a VmAllocationPolicy.
 * Corresponds to VmAllocationWithSelectionPolicy with SelectionPolicyFirstFit.
 *
 * @author Remo Andreoli
 * @since OpenCloud Toolkit 7.0
 */
public class VmAllocationPolicySimpler extends VmAllocationPolicy {
	/**
	 * Creates a new VmAllocationPolicy object.
	 *
	 * @param list Machines available in a {@link Datacenter}
	 * @pre $none
	 * @post $none
	 */
	public VmAllocationPolicySimpler(List<? extends HostEntity> list) {
		super(list);
	}

	@Override
	public HostEntity findHostForGuest(GuestEntity guest) {
		for (HostEntity host : getHostList()) {
			if (host.isSuitableForGuest(guest)) {
				return host;
			}
		}
		return null;
	}
}
