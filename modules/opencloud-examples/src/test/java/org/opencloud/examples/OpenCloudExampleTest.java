package org.opencloud.examples;

import org.opencloud.Cloudlet;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testsuite that utilizes examples in opencloud-examples for system / end-to-end (E2E) testing.
 * The expected results for each assertion are derived from OpenCloud 6G as of:
 *      tag:  https://github.com/Cloudslab/opencloud/tree/6.0-pre
 *      hash: 3a64873d8842a0de009931cf026cd7c51295eb5e
 *
 *
 * @TODO: Currently the focus in on cpu time only, but the tests should be extended to other factor too
 *
 * @author Remo Andreoli
 * @since OpenCloud Toolkit 7.0
 */
public class OpenCloudExampleTest {
    private static final String[] empty = new String[0];

    @Test
    public void runOpenCloudExample1() {
        assertDoesNotThrow(() -> OpenCloudExample1.main(empty));
        for (Cloudlet cl : OpenCloudExample1.broker.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
                case 0 -> assertEquals(400, cl.getActualCPUTime(), 0);
                default -> fail("Unknown cloudlet id");
            }
        }
    }

    @Test
    public void runOpenCloudExample2() {
        assertDoesNotThrow(() -> OpenCloudExample2.main(empty));
        for (Cloudlet cl : OpenCloudExample2.broker.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
                case 0, 1 -> assertEquals(1000, cl.getActualCPUTime(), 0);
				default -> fail("Unknown cloudlet id: " + cl.getCloudletId());
            }
        }
    }

    @Test
    public void runOpenCloudExample3() {
        assertDoesNotThrow(() -> OpenCloudExample3.main(empty));
        for (Cloudlet cl : OpenCloudExample3.broker.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
                case 0 -> assertEquals(160, cl.getActualCPUTime(), 0);
                case 1 -> assertEquals(80, cl.getActualCPUTime(), 0);
                default -> fail("Unknown cloudlet id");
            }
        }
    }

    @Test
    public void runOpenCloudExample4() {
        assertDoesNotThrow(() -> OpenCloudExample4.main(empty));
        for (Cloudlet cl : OpenCloudExample4.broker.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
                case 0, 1 -> assertEquals(160, cl.getActualCPUTime(), 0);
                default -> fail("Unknown cloudlet id");
            }
        }
    }

    @Test
    public void runOpenCloudExample5() {
        assertDoesNotThrow(() -> OpenCloudExample5.main(empty));
        for (Cloudlet cl : OpenCloudExample5.broker1.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
                case 0 -> assertEquals(160, cl.getActualCPUTime(), 0);
                default -> fail("Unknown cloudlet id");
            }
        }

        for (Cloudlet cl : OpenCloudExample5.broker2.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
				case 0, 1 -> assertEquals(160, cl.getActualCPUTime(), 0);
				default -> fail("Unknown cloudlet id: " + cl.getCloudletId());
            }
        }
    }

    @Test
    public void runOpenCloudExample6() {
        assertDoesNotThrow(() -> OpenCloudExample6.main(empty));
        for (Cloudlet cl : OpenCloudExample6.broker.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
                case 4,16,28,5,17,29,6,18,30,7,19,31,8,20,32,10,22,34,9,21,33,11,23,35 -> assertEquals(3, cl.getActualCPUTime(), 0.01);
                case 0,12,24,36,1,13,25,37,2,14,26,38,3,15,27,39 -> assertEquals(4, cl.getActualCPUTime(), 0.01);
                default -> fail("Unknown cloudlet id");
            }
        }
    }

    @Test
    public void runOpenCloudExample7() {
        assertDoesNotThrow(() -> OpenCloudExample7.main(empty));
        for (Cloudlet cl : OpenCloudExample7.broker.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
				case 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 -> assertEquals(320, cl.getActualCPUTime(), 0.01);
                default -> fail("Unknown cloudlet id");
            }
        }
    }

    @Test
    public void runOpenCloudExample8() {
        assertDoesNotThrow(() -> OpenCloudExample8.main(empty));
        List<Cloudlet> clList = OpenCloudExample8.broker.getCloudletReceivedList();
        clList.addAll(OpenCloudExample8.globalBroker.getBroker().getCloudletReceivedList());

        for (Cloudlet cl : clList) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
				case 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109 ->
						assertEquals(320, cl.getActualCPUTime(), 0);
                default -> fail("Unknown cloudlet id");
            }
        }
    }

    @Test
    public void runOpenCloudExample9() {
        assertDoesNotThrow(() -> OpenCloudExample9.main(empty));
        for (Cloudlet cl : OpenCloudExample9.broker.getCloudletReceivedList()) {
            assertEquals(Cloudlet.CloudletStatus.SUCCESS, cl.getStatus());
            switch (cl.getCloudletId()) {
                case 0 -> assertEquals(30, cl.getActualCPUTime(), 0.01);
                case 1 -> assertEquals(210, cl.getActualCPUTime(), 0.01);
                case 2 -> assertEquals(1110, cl.getActualCPUTime(), 0.01);
                case 3 -> assertEquals(10, cl.getActualCPUTime(), 0.01);
                case 4 -> assertEquals(100, cl.getActualCPUTime(), 0.01);
                case 5 -> assertEquals(1000, cl.getActualCPUTime(), 0.01);
                default -> fail("Unknown cloudlet id");
            }
        }
    }
}
