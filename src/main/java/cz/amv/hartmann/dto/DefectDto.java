package cz.amv.hartmann.dto;

import lombok.Data;

@Data
public class DefectDto {
    private Long id;
    private String itemId;
    private Float positionX;
    private Float positionY;
    private Float width;
    private Float height;
    private String station;
    private String type;
}
