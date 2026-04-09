package cz.amv.hartmann.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class RecipeFilter {

    private LocalDate dateFrom;
    private LocalDate dateTo;
    private String eanCode;
    private String dmCode;
    private String camera;
    private String status;
    private String type;
}
