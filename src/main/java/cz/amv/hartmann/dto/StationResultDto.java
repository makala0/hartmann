package cz.amv.hartmann.dto;

import lombok.Data;
import java.util.List;

@Data
public class StationResultDto {
    private Integer stationNumber;
    private String result;
    private String subResult;
    private List<String> imagePaths;  // Cesty k obrázkům
}
