package org.opencloud.web.workload.brokers;

import org.opencloud.core.OpenCloud;
import org.opencloud.EX.IAutoscalingPolicy;
import org.opencloud.EX.MonitoringBrokerEX;
import org.opencloud.EX.disk.HddCloudletSchedulerTimeShared;
import org.opencloud.EX.disk.HddVm;
import org.opencloud.EX.util.CustomLog;
import org.opencloud.EX.vm.VmStatus;
import org.opencloud.web.ILoadBalancer;

import java.util.EnumSet;
import java.util.List;

/**
 * 
 * @author nikolay.grozev
 * 
 */
public class SimpleAutoScalingPolicy implements IAutoscalingPolicy {

    private final double scaleUpCPUTrigger;
    private final double scaleDownCPUTrigger;
    private final double coolDownPeriod;

    private final long appId;
    private final StringBuilder debugSB = new StringBuilder();

    private double lastActionTime = -1;

    public SimpleAutoScalingPolicy(long appId, double scaleUpCPUTrigger, double scaleDownCPUTrigger,
            double coolDownPeriod) {
        super();
        if (scaleUpCPUTrigger < scaleDownCPUTrigger) {
            throw new IllegalArgumentException("Scale-up ratio should be greater than scale-down. Provided values: "
                    + scaleUpCPUTrigger + "; " + scaleDownCPUTrigger);
        }

        this.scaleUpCPUTrigger = scaleUpCPUTrigger;
        this.scaleDownCPUTrigger = scaleDownCPUTrigger;
        this.coolDownPeriod = coolDownPeriod;
        this.appId = appId;
    }

    @Override
    public void scale(MonitoringBrokerEX broker) {
        double currentTime = OpenCloud.clock();
        boolean performScaling = lastActionTime < 0 || lastActionTime + coolDownPeriod < currentTime;

        if (performScaling && broker instanceof WebBroker webBroker) {
            debugSB.setLength(0);

            ILoadBalancer loadBalancer = webBroker.getLoadBalancers().get(appId);

            double avgCPU = 0;
            int count = 0;
            HddVm candidateToStop = null;
            for (HddVm vm : loadBalancer.getAppServers()) {
                if (!EnumSet.of(VmStatus.INITIALISING, VmStatus.RUNNING).contains(vm.getStatus())) {
                    continue;
                }
                avgCPU += vm.getCPUUtil();
                count++;
                candidateToStop = vm;
                debugSB.append(vm);
                debugSB.append("[").append(vm.getStatus().name()).append("] ");
                debugSB.append(String.format("cpu(%.2f) ram(%.2f) cdlts(%d);\t", vm.getCPUUtil(), vm.getRAMUtil(), vm
                        .getCloudletScheduler().getCloudletExecList().size()));
            }
            avgCPU = count == 0 ? 0 : avgCPU / count;

            CustomLog.printf("Simple-Autoscale(%s) avg-cpu(%.2f): %s", broker, avgCPU, debugSB);

            if (avgCPU > scaleUpCPUTrigger) {
                HddVm newASServer = loadBalancer.getAppServers().get(0).clone(new HddCloudletSchedulerTimeShared());
                loadBalancer.registerAppServer(newASServer);
                webBroker.createVmsAfter(List.of(newASServer), 0);
                lastActionTime = currentTime;

                CustomLog.printf("Simple-Autoscale(%s) Scale-Up: New AS VMs provisioned: %s", webBroker.toString(),
                        newASServer);
            } else if (avgCPU < scaleDownCPUTrigger && count > 1) {
                List<HddVm> toStop = List.of(candidateToStop);
                webBroker.destroyVMsAfter(toStop, 0);
                loadBalancer.getAppServers().removeAll(toStop);
                lastActionTime = currentTime;

                CustomLog
                        .printf("Simple-Autoscale(%s) Scale-Down: AS VMs terminated: %s, sessions to be killed:",
                                webBroker.toString(), toStop.toString(),
                                webBroker.getSessionsInServer(candidateToStop.getId()));
            }
        }
    }

}
