package cz.amv.hartmann.controller;

import cz.amv.hartmann.domain.ItemClassification;
import cz.amv.hartmann.repository.ItemClassificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequiredArgsConstructor
public class ItemClassificationController {
    private final ItemClassificationRepository snapshots;
    @GetMapping("/api/dashboard/item/{id}/classifications")
    public List<ItemClassification> history(@PathVariable Long id) {
        return snapshots.findByItemRecordIdOrderByCreatedAtDesc(id);
    }
}
