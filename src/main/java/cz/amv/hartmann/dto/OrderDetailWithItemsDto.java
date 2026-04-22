package cz.amv.hartmann.dto;

import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class OrderDetailWithItemsDto {
    private Long id;
    private Long orderId;
    private String orderNumber;
    private String ref;
    private String sku;
    private Long okCount;
    private Long nokCount;
    private Long reworkCount;
    private Long totalCount;
    private Double okPercentage;
    private Instant orderBeginDate;
    private String lineType;

    private List<ItemDto> items;
}
