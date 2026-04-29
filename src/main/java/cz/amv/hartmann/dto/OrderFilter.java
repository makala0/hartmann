package cz.amv.hartmann.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class OrderFilter {
    private String lineType;

    private Long orderId;

    private Long orderNumber;

    private LocalDate dateFrom;

    private LocalDate dateTo;

    private String sku;

    private String ref;

    private String recipe;
}
