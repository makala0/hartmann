package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@org.hibernate.annotations.Immutable
@Table(name = "item_classifications", uniqueConstraints = @UniqueConstraint(columnNames = {"item_record_id", "source_hash"}),
        indexes = @Index(name = "idx_classification_code_item", columnList = "code,item_record_id,id"))
@Getter @Setter
public class ItemClassification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "item_record_id", nullable = false) private Long itemRecordId;
    @Column(name = "source_hash", nullable = false, length = 64) private String sourceHash;
    @Column(name = "rule_id", nullable = false) private Long ruleId;
    @Column(nullable = false, length = 50) private String code;
    @Column(name = "description_cs", nullable = false, length = 1000) private String descriptionCs;
    @Column(name = "description_en", length = 1000) private String descriptionEn;
    @Column(nullable = false) private Integer station;
    @Column(nullable = false, length = 10) private String result;
    @Column(name = "rule_revision", nullable = false) private Integer ruleRevision;
    @Lob @Column(name = "observations_json", nullable = false) private String observationsJson;
    @Column(name = "created_at", nullable = false) private java.time.Instant createdAt;
}
