/*
 * Title: OpenCloud Toolkit Description: OpenCloud (Cloud Simulation) Toolkit for Modeling and
 * Simulation of Clouds Licence: GPL - http://www.gnu.org/copyleft/gpl.html
 *
 * Copyright (c) 2009-2024, The University of Melbourne, Australia
 */

package org.opencloud.core;

import org.opencloud.network.datacenter.NetworkInterfaceCard;
import org.opencloud.network.datacenter.Switch;

import java.util.Map;

/**
 * An interface exposing the functionalities required by an entity that needs to interact with a virtual/physical network
 *
 * @author Remo Andreoli
 * @since OpenCloud Toolkit 7.0
 */
public interface NetworkedEntity {
    void sendPackets();

    Map<Integer, NetworkInterfaceCard> getNics();

    Switch getSwitch();
    void setSwitch(Switch sw);
}
