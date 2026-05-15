package org.cloudbus.cloudsim.web.simulation;

import java.util.List;

public record StoredResult(
        List<CloudletResultDto> cloudlets,
        boolean logsTruncated
) {}
