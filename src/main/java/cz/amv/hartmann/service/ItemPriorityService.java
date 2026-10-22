package cz.amv.hartmann.service;

import cz.amv.hartmann.dto.ItemPriorityDto;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Codes describe station outcomes until individual camera defect types are specified. */
@Component
@ConfigurationProperties(prefix = "hartmann.defect-codes")
@Getter
@Setter
public class ItemPriorityService {
    private String version = "temporary-v1";
    private Map<String, String> codes = new LinkedHashMap<>(Map.of(
            "ST1_NOK", "1.0.1", "ST1_REWORK", "1.0.2",
            "ST2_NOK", "2.0.1", "ST2_REWORK", "2.0.2",
            "ST3_NOK", "3.0.1", "ST3_REWORK", "3.0.2"));

    public ItemPriorityDto evaluate(String station1, String station2, String station3) {
        ItemPriorityDto dto = new ItemPriorityDto();
        dto.setCodeVersion(version);
        dto.setStatus("INCOMPLETE");
        Map<Integer, String> results = Map.of(1, normalize(station1), 2, normalize(station2), 3, normalize(station3));
        // A missing/technical/unrecognized result is not an OK inspection.
        if (results.values().stream().anyMatch(value -> !List.of("OK", "NOK", "REWORK").contains(value))) return dto;
        for (String severity : List.of("NOK", "REWORK")) {
            for (int station : List.of(3, 1, 2)) {
                if (!severity.equals(results.get(station))) continue;
                String key = "ST" + station + "_" + severity;
                String code = codes.get(key);
                if (code == null || code.isBlank() || version == null || version.isBlank()) return dto;
                dto.setStatus("COMPLETE");
                dto.setResult(severity);
                dto.setStation(station);
                dto.setLogicalKey(key);
                dto.setCode(code);
                return dto;
            }
        }
        dto.setStatus("COMPLETE");
        dto.setResult("OK");
        return dto;
    }

    private String normalize(String result) {
        return result == null ? "" : result.trim().toUpperCase(Locale.ROOT);
    }
}
