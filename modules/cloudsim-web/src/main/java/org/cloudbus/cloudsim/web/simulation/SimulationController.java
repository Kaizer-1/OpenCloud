package org.cloudbus.cloudsim.web.simulation;

import org.cloudbus.cloudsim.web.model.SimulationConfigDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/simulations")
public class SimulationController {

    private final SimulationService service;

    public SimulationController(SimulationService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<?> submit(@RequestBody SimulationConfigDto config,
                                    @AuthenticationPrincipal Long userId) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(service.submit(config, userId));
    }

    @GetMapping
    public List<SimulationSummaryDto> list(@AuthenticationPrincipal Long userId) {
        return service.listForUser(userId);
    }

    @GetMapping("/{id}")
    public SimulationResultDto getResult(@PathVariable("id") long id,
                                         @AuthenticationPrincipal Long userId) {
        return service.getResult(id, userId);
    }
}
