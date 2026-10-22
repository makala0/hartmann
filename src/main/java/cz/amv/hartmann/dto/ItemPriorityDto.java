package cz.amv.hartmann.dto;

import lombok.Data;

@Data
public class ItemPriorityDto {
    private String status;
    private String result;
    private Integer station;
    private String code;
    private String logicalKey;
    private String codeVersion;
    private String descriptionCs;
    private String descriptionEn;
    private Long snapshotId;
    private String catalogStatus;
}
