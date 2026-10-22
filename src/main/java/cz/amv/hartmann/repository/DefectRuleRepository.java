package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.DefectRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DefectRuleRepository extends JpaRepository<DefectRule, Long> {
    java.util.Optional<DefectRule> findTopByOrderByIdDesc();
    @org.springframework.data.jpa.repository.Query("SELECT r FROM DefectRule r WHERE NOT EXISTS "
            + "(SELECT newer.id FROM DefectRule newer WHERE newer.station = r.station "
            + "AND newer.cameraType = r.cameraType AND newer.revision > r.revision)")
    List<DefectRule> findCurrent();
    List<DefectRule> findAllByOrderByIdDesc();
}
