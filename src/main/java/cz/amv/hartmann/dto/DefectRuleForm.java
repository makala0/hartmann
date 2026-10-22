package cz.amv.hartmann.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class DefectRuleForm {
    @NotNull @Min(1) @Max(3) private Integer station;
    @NotBlank @Size(max = 200) private String cameraType;
    @NotBlank @Size(max = 50) private String code;
    @NotBlank @Size(max = 1000) private String descriptionCs;
    @Size(max = 1000) private String descriptionEn;
    @Min(0) private Integer priority;
    private boolean enabled = true;
    // Null for a new mapping. Updating requires the current immutable revision ID.
    private Long previousRuleId;
}
