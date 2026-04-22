package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "item")
@Getter
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Size(max = 50)
    @NotNull
    @Column(name = "item_id", nullable = false, length = 50)
    private String itemId;

    @Size(max = 50)
    @NotNull
    @Column(name = "serial_number", nullable = false, length = 50)
    private String serialNumber;

    @NotNull
    @Column(name = "end_inspection_time", nullable = false)
    private Instant endInspectionTime;

    @Size(max = 50)
    @NotNull
    @Column(name = "sku", nullable = false, length = 50)
    private String sku;

    @Size(max = 50)
    @NotNull
    @Column(name = "ref", nullable = false, length = 50)
    private String ref;

    @NotNull
    @Column(name = "order_number", nullable = false)
    private Long orderNumber;

    @NotNull
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "camera_number", columnDefinition = "tinyint not null")
    private Short cameraNumber;

    @Size(max = 20)
    @NotNull
    @Column(name = "defect_type", nullable = false, length = 20)
    private String defectType;

    @Size(max = 10)
    @NotNull
    @Column(name = "total_result", nullable = false, length = 10)
    private String totalResult;

    @Size(max = 50)
    @NotNull
    @Column(name = "station1_image_path", nullable = false, length = 50)
    private String station1ImagePath;

    @Size(max = 50)
    @NotNull
    @Column(name = "station2_image_path", nullable = false, length = 50)
    private String station2ImagePath;

    @Size(max = 50)
    @NotNull
    @Column(name = "station3_image_path", nullable = false, length = 50)
    private String station3ImagePath;

    @Size(max = 10)
    @NotNull
    @Column(name = "station1_result", nullable = false, length = 10)
    private String station1Result;

    @Size(max = 10)
    @NotNull
    @Column(name = "station2_result", nullable = false, length = 10)
    private String station2Result;

    @Setter
    @Size(max = 10)
    @NotNull
    @Column(name = "station3_result", nullable = false, length = 10)
    private String station3Result;
}
