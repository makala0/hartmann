package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Size(max = 10)
    @NotNull
    @Column(name = "line_type", nullable = false, length = 10)
    private String lineType;

    @NotNull
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @NotNull
    @Column(name = "order_number", nullable = false)
    private Long orderNumber;

    @NotNull
    @Column(name = "order_begin_date", nullable = false)
    private Instant orderBeginDate;

    @Size(max = 50)
    @NotNull
    @Column(name = "sku", nullable = false, length = 50)
    private String sku;

    @Size(max = 50)
    @NotNull
    @Column(name = "ref", nullable = false, length = 50)
    private String ref;

    @NotNull
    @Column(name = "ok_count", nullable = false)
    private Long okCount;

    @NotNull
    @Column(name = "nok_count", nullable = false)
    private Long nokCount;

    @NotNull
    @Column(name = "rework_count", nullable = false)
    private Long reworkCount;

    @NotNull
    @Column(name = "total_count", nullable = false)
    private Long totalCount;

    @NotNull
    @Column(name = "ok_percentage", nullable = false)
    private Double okPercentage;
}
