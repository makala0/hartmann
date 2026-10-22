package cz.amv.hartmann.controller;

import cz.amv.hartmann.domain.DefectRule;
import cz.amv.hartmann.dto.DefectRuleForm;
import cz.amv.hartmann.repository.DefectRuleRepository;
import cz.amv.hartmann.service.DefectCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Collection;
import java.util.List;

@RestController @RequestMapping("/api/defect-catalog") @RequiredArgsConstructor
public class DefectCatalogController {
    private final DefectCatalogService service;
    private final DefectRuleRepository repository;
    private final cz.amv.hartmann.service.ItemClassificationIndexer indexer;
    @GetMapping public Collection<DefectRule> list() { return service.current().values(); }
    @GetMapping("/history") public List<DefectRule> history() { return repository.findAllByOrderByIdDesc(); }
    @PostMapping("/reindex") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reindex() { indexer.rebuild(); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public DefectRule save(@Valid @RequestBody DefectRuleForm form) { return service.save(form); }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public String conflict() { return "Pravidlo bylo souběžně změněno. Obnovte číselník."; }
}
