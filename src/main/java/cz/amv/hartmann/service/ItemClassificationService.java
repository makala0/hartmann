package cz.amv.hartmann.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cz.amv.hartmann.domain.DefectRule;
import cz.amv.hartmann.domain.ItemClassification;
import cz.amv.hartmann.dto.DefectDto;
import cz.amv.hartmann.dto.ItemDto;
import cz.amv.hartmann.dto.ItemPriorityDto;
import cz.amv.hartmann.repository.ItemClassificationRepository;
import cz.amv.hartmann.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class ItemClassificationService {
    private final DefectCatalogService catalog;
    private final ItemClassificationRepository snapshots;
    private final ItemRepository items;
    private final ObjectMapper json;

    public static int station(String value) {
        String name = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        return switch (name) { case "ST1" -> 1; case "ST2" -> 2; case "ST3" -> 3; default -> 0; };
    }

    @Transactional
    public void enrich(List<ItemDto> rows) {
        if (rows.isEmpty()) return;
        Map<String, DefectRule> rules = catalog.current();
        Map<String, Long> counts = new HashMap<>();
        items.countIdentities(rows.stream().map(ItemDto::getItemId).distinct().toList())
                .forEach(count -> counts.put(count.getItemId(), count.getTotal()));
        Map<String, ItemClassification> saved = new HashMap<>();
        snapshots.findByItemRecordIdIn(rows.stream().map(ItemDto::getId).toList())
                .forEach(snapshot -> saved.put(snapshot.getItemRecordId() + ":" + snapshot.getSourceHash(), snapshot));
        for (ItemDto item : rows) {
            if (item.getDefects() == null || item.getDefects().isEmpty()) continue;
            ItemPriorityDto fallback = item.getPriority();
            if (counts.getOrDefault(item.getItemId(), 0L) != 1) {
                fallback.setCatalogStatus("AMBIGUOUS_ITEM"); continue;
            }
            String fingerprint = fingerprint(item);
            var cached = saved.get(item.getId() + ":" + fingerprint);
            if (cached != null) { item.setPriority(toDto(cached)); continue; }
            if (rules.isEmpty()) { fallback.setCatalogStatus("UNMAPPED"); continue; }
            List<DefectRule> matches = new ArrayList<>();
            for (DefectDto defect : item.getDefects()) {
                DefectRule rule = rules.get(DefectCatalogService.key(station(defect.getStation()), defect.getType()));
                if (rule == null || !rule.isEnabled()) { matches.clear(); break; }
                matches.add(rule);
            }
            if (matches.isEmpty()) { fallback.setCatalogStatus("UNMAPPED"); continue; }
            Map<Integer, String> stationResults = Map.of(1, normalize(item.getStation1Result()),
                    2, normalize(item.getStation2Result()), 3, normalize(item.getStation3Result()));
            boolean valid = stationResults.values().stream().allMatch(result -> Set.of("OK", "NOK", "REWORK").contains(result));
            // A station with observations cannot report OK, and a rejected station needs an observation.
            for (int station = 1; station <= 3; station++) {
                int number = station;
                boolean hasDefects = matches.stream().anyMatch(rule -> rule.getStation() == number);
                if (hasDefects == "OK".equals(stationResults.get(station))) valid = false;
            }
            if (!valid) { fallback.setCatalogStatus("INCONSISTENT"); continue; }
            Comparator<DefectRule> base = Comparator.comparingInt((DefectRule r) -> stationResults.get(r.getStation()).equals("NOK") ? 2 : 1)
                    .thenComparingInt(r -> r.getStation() == 3 ? 3 : r.getStation() == 1 ? 2 : 1);
            DefectRule highest = matches.stream().max(base).orElseThrow();
            List<DefectRule> tied = matches.stream().filter(r -> base.compare(r, highest) == 0).distinct().toList();
            DefectRule main = highest;
            if (tied.size() > 1) {
                if (tied.stream().anyMatch(r -> r.getPriority() == null)) {
                    fallback.setCatalogStatus("AMBIGUOUS_PRIORITY"); continue;
                }
                main = tied.stream().max(Comparator.comparingInt(DefectRule::getPriority)).orElseThrow();
                int priority = main.getPriority();
                if (tied.stream().filter(r -> r.getPriority() == priority).count() > 1) {
                    fallback.setCatalogStatus("AMBIGUOUS_PRIORITY"); continue;
                }
            }
            // Serialize creation per item. A catalogue edit never replaces an existing snapshot.
            var currentItem = items.lockForClassification(item.getId()).orElseThrow();
            if (!Objects.equals(currentItem.getStation1Result(), item.getStation1Result())
                    || !Objects.equals(currentItem.getStation2Result(), item.getStation2Result())
                    || !Objects.equals(currentItem.getStation3Result(), item.getStation3Result())) {
                fallback.setCatalogStatus("SOURCE_CHANGED"); continue;
            }
            var existing = snapshots.findByItemRecordIdAndSourceHash(item.getId(), fingerprint);
            if (existing.isPresent()) { item.setPriority(toDto(existing.get())); continue; }
            ItemClassification snapshot = new ItemClassification();
            snapshot.setItemRecordId(item.getId()); snapshot.setSourceHash(fingerprint);
            snapshot.setRuleId(main.getId()); snapshot.setRuleRevision(main.getRevision());
            snapshot.setCode(main.getCode()); snapshot.setDescriptionCs(main.getDescriptionCs());
            snapshot.setDescriptionEn(main.getDescriptionEn()); snapshot.setResult(stationResults.get(main.getStation()));
            snapshot.setStation(main.getStation()); snapshot.setCreatedAt(Instant.now());
            snapshot.setObservationsJson(encode(matches));
            item.setPriority(toDto(snapshots.saveAndFlush(snapshot)));
        }
    }

    private ItemPriorityDto toDto(ItemClassification snapshot) {
        ItemPriorityDto dto = new ItemPriorityDto();
        dto.setStatus("COMPLETE"); dto.setCatalogStatus("CLASSIFIED"); dto.setResult(snapshot.getResult());
        dto.setStation(snapshot.getStation()); dto.setCode(snapshot.getCode());
        dto.setLogicalKey("RULE_" + snapshot.getRuleId()); dto.setCodeVersion("revision-" + snapshot.getRuleRevision());
        dto.setDescriptionCs(snapshot.getDescriptionCs()); dto.setDescriptionEn(snapshot.getDescriptionEn());
        dto.setSnapshotId(snapshot.getId()); return dto;
    }

    private String fingerprint(ItemDto item) {
        List<Object> source = new ArrayList<>(Arrays.asList(item.getId(), item.getItemId(), item.getOrderId(),
                item.getStation1Result(), item.getStation2Result(), item.getStation3Result()));
        item.getDefects().stream().sorted(Comparator.comparing(DefectDto::getId)).forEach(d ->
                source.add(Arrays.asList(d.getId(), d.getStation(), d.getType())));
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(encode(source).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }

    private String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException(exception); }
    }
    private String normalize(String value) { return value == null ? "" : value.trim().toUpperCase(Locale.ROOT); }
}
