package org.opencloud.web.templates;

import org.opencloud.web.model.SimulationConfigDto;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService service;

    public TemplateController(TemplateService service) {
        this.service = service;
    }

    @GetMapping
    public List<TemplateService.TemplateMeta> list() {
        return service.listTemplates();
    }

    @GetMapping("/{id}")
    public SimulationConfigDto get(@PathVariable("id") String id) {
        return service.getTemplate(id);
    }
}
