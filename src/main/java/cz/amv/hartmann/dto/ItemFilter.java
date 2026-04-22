package cz.amv.hartmann.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ItemFilter {
    private String defectType;
    private String totalResult;
    private Integer cameraNumber;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private String serialNumber;
    private String itemId;
}