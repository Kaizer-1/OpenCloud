/*
 * Title:        OpenCloud Toolkit
 * Description:  OpenCloud (Cloud Simulation) Toolkit for Modeling and Simulation of Clouds
 * Licence:      GPL - http://www.gnu.org/copyleft/gpl.html
 *
 * Copyright (c) 2009-2012, The University of Melbourne, Australia
 */

package org.opencloud.core;

/**
 * CloudimShutdown waits for termination of all OpenCloud user entities to determine the end of
 * simulation. This class will be created by OpenCloud upon initialisation of the simulation, i.e.
 * done via OpenCloud.init() method. Hence, do not need to worry about creating an object of
 * this class. This object signals the end of simulation to CloudInformationService (CIS) entity.
 * 
 * @author Manzur Murshed
 * @author Rajkumar Buyya
 * @since OpenCloud Toolkit 1.0
 */
public class OpenCloudShutdown extends SimEntity {

	/** The total number of cloud users. */
	private int numUser;

	/**
	 * Instantiates a new OpenCloudShutdown object.
	 * <p/>
	 * The total number of cloud user entities plays an important role to determine whether all
	 * hostList' should be shut down or not. If one or more users are still not finished, then the
	 * hostList's will not be shut down. Therefore, it is important to give a correct number of total
	 * cloud user entities. Otherwise, OpenCloud program will hang or encounter a weird behaviour.
	 * 
	 * @param name the name to be associated with this entity (as required by {@link SimEntity} class)
	 * @param numUser total number of cloud user entities
	 * @throws Exception when creating this entity before initialising OpenCloud package
	 *             or this entity name is <tt>null</tt> or empty
	 * @see OpenCloud#init(int, java.util.Calendar, boolean) 
	 * @pre name != null
	 * @pre numUser >= 0
	 * @post $none
         * 
         * //@TODO The use of Exception is not recommended. Specific exceptions
         * would be thrown (such as {@link IllegalArgumentException})
         * or {@link RuntimeException}
	 */
	public OpenCloudShutdown(String name, int numUser) throws Exception {
		// NOTE: This entity doesn't use any I/O port.
		// super(name, Consts.DEFAULT_BAUD_RATE);
		super(name);
		this.numUser = numUser;
	}

	/**
	 * The main method that shuts down hostList's and Cloud Information Service (CIS). In addition,
	 * this method writes down a report at the end of a simulation based on
	 * <tt>reportWriterName</tt> defined in the Constructor. <br/>
	 * <b>NOTE:</b> This method shuts down cloud hostList's and CIS entities either <tt>AFTER</tt> all
	 * cloud users have been shut down or an entity requires an abrupt end of the whole simulation.
	 * In the first case, the number of cloud users given in the Constructor <tt>must</tt> be
	 * correct. Otherwise, OpenCloud package hangs forever or it does not terminate properly.
	 * 
	 * @param ev the ev
	 * @pre $none
	 * @post $none
	 */
	@Override
	public void processEvent(SimEvent ev) {
		numUser--;
		if (numUser == 0 || ev.getTag() == CloudActionTags.ABRUPT_END_OF_SIMULATION) {
			OpenCloud.abruptallyTerminate();
		}
	}

        /**
         * The method has no effect at the current class.
         */
	@Override
	public void startEntity() {
		// do nothing
	}
        
        /**
         * The method has no effect at the current class.
         */
	@Override
	public void shutdownEntity() {
		// do nothing
	}
}
