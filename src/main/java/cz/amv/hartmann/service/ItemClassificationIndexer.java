package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.DefectRule;
import cz.amv.hartmann.domain.Item;
import cz.amv.hartmann.repository.DefectRuleRepository;
import cz.amv.hartmann.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/** Camera records are inserted only once all station results and defects are complete. */
@Service @RequiredArgsConstructor
public class ItemClassificationIndexer {
    private final ItemRepository items;
    private final DefectRuleRepository rules;
    private final ItemInspectionMapper mapper;
    private long cursor;
    private long catalogueRevision = -1;

    private long boundary() {
        long revision = rules.findTopByOrderByIdDesc().map(DefectRule::getId).orElse(0L);
        if (revision != catalogueRevision) { cursor = 0; catalogueRevision = revision; }
        if (revision == 0) return 0;
        long boundary = items.findTopByOrderByIdDesc().map(Item::getId).orElse(0L);
        if (cursor > boundary) cursor = 0;
        return boundary;
    }

    private int batch(long boundary) {
        var rows = items.findByIdGreaterThanAndIdLessThanEqualOrderByIdAsc(cursor, boundary, PageRequest.of(0, 200));
        if (rows.isEmpty()) { cursor = boundary; return 0; }
        mapper.convertToDtos(rows);
        cursor = rows.get(rows.size() - 1).getId();
        return rows.size();
    }

    public synchronized void nextBatch() { batch(boundary()); }

    /** Catch up to a fixed high-water mark before any main-code filter is paged/counts computed. */
    public synchronized void catchUp() {
        long boundary = boundary();
        while (cursor < boundary && batch(boundary) > 0) { /* bounded batches */ }
    }

    public synchronized void rebuild() { cursor = 0; catchUp(); }
}
