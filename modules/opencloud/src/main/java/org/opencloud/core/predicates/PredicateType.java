/*
 * Title:        OpenCloud Toolkit
 * Description:  OpenCloud (Cloud Simulation) Toolkit for Modeling and Simulation of Clouds
 * Licence:      GPL - http://www.gnu.org/copyleft/gpl.html
 *
 * Copyright (c) 2009-2012, The University of Melbourne, Australia
 */

package org.opencloud.core.predicates;

import org.opencloud.core.OpenCloudTags;
import org.opencloud.core.SimEvent;

/**
 * A predicate to select events with specific tags.
 * 
 * @author Marcos Dias de Assuncao
 * @since OpenCloud Toolkit 1.0
 * @see PredicateNotType
 * @see Predicate
 */
public class PredicateType extends Predicate {

	/** Array of tags to verify if the tag of received events correspond to. */
	private final OpenCloudTags[] tags;

	/**
	 * Constructor used to select events with the given tag value.
	 * 
	 * @param t1 an event tag value
	 */
	public PredicateType(OpenCloudTags t1) {
		tags = new OpenCloudTags[] { t1 };
	}

	/**
	 * Constructor used to select events with a tag value equal to any of the specified tags.
	 * 
	 * @param tags the list of tags
	 */
	public PredicateType(OpenCloudTags[] tags) {
		this.tags = tags.clone();
	}

	/**
	 * Matches any event that has one of the specified {@link #tags}.
	 * 
	 * @param ev {@inheritDoc}
	 * @return {@inheritDoc}
         * @see #tags
	 */
	@Override
	public boolean match(SimEvent ev) {
		OpenCloudTags tag = ev.getTag();
		for (OpenCloudTags tag2 : tags) {
			if (tag == tag2) {
				return true;
			}
		}
		return false;
	}

}
