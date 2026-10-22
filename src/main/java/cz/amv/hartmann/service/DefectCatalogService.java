package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.DefectRule;
import cz.amv.hartmann.domain.DefectCodeReservation;
import cz.amv.hartmann.repository.DefectCodeReservationRepository;
import cz.amv.hartmann.dto.DefectRuleForm;
import cz.amv.hartmann.repository.DefectRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.text.Normalizer;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class DefectCatalogService {
    private final DefectRuleRepository rules;
    private final DefectCodeReservationRepository reservations;
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    public static String normalize(String name) {
        return name == null ? "" : Normalizer.normalize(name.trim(), Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
    }

    public static String key(int station, String type) { return station + ":" + normalize(type); }

    public Map<String, DefectRule> current() {
        Map<String, DefectRule> result = new LinkedHashMap<>();
        rules.findCurrent().forEach(rule -> result.put(key(rule.getStation(), rule.getCameraType()), rule));
        return result;
    }

    @Transactional
    public DefectRule save(DefectRuleForm form) {
        Map<String, DefectRule> latest = current();
        DefectRule previous = latest.get(key(form.getStation(), form.getCameraType()));
        if ((previous == null && form.getPreviousRuleId() != null)
                || (previous != null && !previous.getId().equals(form.getPreviousRuleId()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Pravidlo bylo změněno. Obnovte číselník.");
        }
        String mapping = key(form.getStation(), form.getCameraType());
        String normalizedCode = form.getCode().trim().toUpperCase(Locale.ROOT);
        if (rules.findAllByOrderByIdDesc().stream().anyMatch(rule -> rule.getCode().equalsIgnoreCase(normalizedCode)
                && !key(rule.getStation(), rule.getCameraType()).equals(mapping))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Kód již používá jiný typ vady.");
        }
        var reserved = reservations.findById(normalizedCode);
        if (reserved.isPresent() && !key(reserved.get().getStation(), reserved.get().getCameraType()).equals(mapping)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Kód má jiný historický význam.");
        }
        if (reserved.isEmpty()) {
            DefectCodeReservation reservation = new DefectCodeReservation();
            reservation.setCode(normalizedCode); reservation.setStation(form.getStation());
            reservation.setCameraType(normalize(form.getCameraType()));
            entityManager.persist(reservation);
            entityManager.flush();
        }
        DefectRule rule = new DefectRule();
        rule.setStation(form.getStation()); rule.setCameraType(normalize(form.getCameraType()));
        rule.setRevision(previous == null ? 1 : previous.getRevision() + 1);
        rule.setCode(form.getCode().trim()); rule.setDescriptionCs(form.getDescriptionCs().trim());
        rule.setDescriptionEn(form.getDescriptionEn());
        rule.setPriority(form.getPriority()); rule.setEnabled(form.isEnabled()); rule.setCreatedAt(Instant.now());
        return rules.saveAndFlush(rule);
    }
}
