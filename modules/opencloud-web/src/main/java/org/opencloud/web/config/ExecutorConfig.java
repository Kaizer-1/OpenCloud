package org.opencloud.web.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class ExecutorConfig {

    /**
     * Single-threaded executor for OpenCloud runs.
     * OpenCloud uses static global state (OpenCloud.init), so only one simulation
     * may run at a time in this JVM. All submitted jobs are serialized through
     * this executor.
     */
    @Bean(destroyMethod = "shutdown")
    public ExecutorService simulationExecutor() {
        return Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "opencloud-runner");
            t.setDaemon(true);
            return t;
        });
    }
}
