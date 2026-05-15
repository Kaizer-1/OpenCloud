/*
 * Title: OpenCloud Toolkit Description: OpenCloud (Cloud Simulation) Toolkit for Modeling and
 * Simulation of Clouds Licence: GPL - http://www.gnu.org/copyleft/gpl.html
 *
 * Copyright (c) 2009-2024, The University of Melbourne, Australia
 */

package org.opencloud.core;

/**
 * Represents a virtual entity that runs inside a Host and can run cloudlets as well as other Guest entities
 * (for nested virtualization).
 *
 * @author Remo Andreoli
 * @since OpenCloud Toolkit 7.0
 */
public interface VirtualEntity extends HostEntity, GuestEntity {}
