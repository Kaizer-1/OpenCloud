package org.opencloud.web.workload.brokers;

import org.opencloud.EX.disk.HddVm;
import org.opencloud.web.IDBBalancer;
import org.opencloud.web.SimpleWebLoadBalancer;

import java.util.List;

/**
 * 
 * @author nikolay.grozev
 * 
 */
public class RoundRobinWebLoadBalancer extends SimpleWebLoadBalancer {

    public RoundRobinWebLoadBalancer(long appId, String ip, List<HddVm> appServers, IDBBalancer dbBalancer,
            WebBroker broker) {
        super(appId, ip, appServers, dbBalancer, broker);
    }

    protected static double evaluateSuitability(final HddVm vm) {
        return 1;
    }
}
