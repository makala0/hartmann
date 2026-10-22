package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@org.hibernate.annotations.Immutable
@Table(name = "defect_rules", uniqueConstraints = @UniqueConstraint(columnNames = {"station", "camera_type", "revision"}))
@Getter @Setter
public class DefectRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Integer station;
    @Column(name = "camera_type", nullable = false, length = 200) private String cameraType;
    @Column(nullable = false) private Integer revision;
    @Column(nullable = false, length = 50) private String code;
    @Column(name = "description_cs", nullable = false, length = 1000) private String descriptionCs;
    @Column(name = "description_en", length = 1000) private String descriptionEn;
    @Column(nullable = false, length = 10) private String severity;
    private Integer priority;
    @Column(nullable = false) private boolean enabled;
    @Column(name = "created_at", nullable = false) private java.time.Instant createdAt;
}
