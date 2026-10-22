package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** A historical code must never acquire the meaning of another mapping. */
@Entity @Table(name = "defect_code_reservations") @Getter @Setter
@org.hibernate.annotations.Immutable
public class DefectCodeReservation {
    @Id @Column(length = 50) private String code;
    @Column(nullable = false) private Integer station;
    @Column(name = "camera_type", nullable = false, length = 200) private String cameraType;
}
