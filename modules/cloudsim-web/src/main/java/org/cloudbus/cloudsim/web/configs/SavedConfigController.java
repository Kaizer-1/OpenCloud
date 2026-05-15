package org.cloudbus.cloudsim.web.configs;

import org.cloudbus.cloudsim.web.model.SimulationConfigDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/configs")
public class SavedConfigController {

    private final SavedConfigService service;

    public SavedConfigController(SavedConfigService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<SavedConfigService.ConfigMeta> save(
            @RequestBody SimulationConfigDto config,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(config, userId));
    }

    @GetMapping
    public List<SavedConfigService.ConfigMeta> list(@AuthenticationPrincipal Long userId) {
        return service.list(userId);
    }

    @GetMapping("/{id}")
    public SimulationConfigDto get(@PathVariable("id") long id,
                                   @AuthenticationPrincipal Long userId) {
        return service.get(id, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") long id,
                                       @AuthenticationPrincipal Long userId) {
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
