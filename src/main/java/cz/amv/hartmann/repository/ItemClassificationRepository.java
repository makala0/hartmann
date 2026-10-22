package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.ItemClassification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ItemClassificationRepository extends JpaRepository<ItemClassification, Long> {
    List<ItemClassification> findByItemRecordIdIn(java.util.Collection<Long> ids);
    Optional<ItemClassification> findByItemRecordIdAndSourceHash(Long itemId, String hash);
    List<ItemClassification> findByItemRecordIdOrderByCreatedAtDesc(Long itemId);
}
