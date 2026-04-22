
package cz.amv.hartmann.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class ItemDto {
    private Long id;
    private String itemId;
    private String serialNumber;
    private Instant endInspectionTime;
    private String sku;
    private String ref;
    private Long orderNumber;
    private Long orderId;
    private Short cameraNumber;
    private String defectType;
    private String totalResult;
    private String station1Result;
    private String station2Result;
    private String station3Result;
    private String station1ImagePath;
    private String station2ImagePath;
    private String station3ImagePath;
}