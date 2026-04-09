package cz.amv.hartmann.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ProductDto {
    private Long id;
    private LocalDateTime measuredAt;
    private String overallResult;
    private List<StationResultDto> stationResults;  // 3 stanice
}