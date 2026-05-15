package org.cloudbus.cloudsim.web.simulation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SimulationRunRepository extends JpaRepository<SimulationRun, Long> {
    List<SimulationRun> findByUserIdOrderByCreatedAtDesc(Long userId);
}
