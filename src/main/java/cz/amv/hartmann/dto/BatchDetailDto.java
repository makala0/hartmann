
package cz.amv.hartmann.dto;

import lombok.Data;
import java.util.List;

@Data
public class BatchDetailDto {
    private RecipeDto recipe;
    private List<ProductDto> products;
    private Integer totalProducts;
    private Integer okProducts;
    private Integer nokProducts;

    @Data
    public static class RecipeDto {
        private Long id;
        private String batchId;
        private String startTime;
        private String specification;
        private Integer okCount;
        private Integer nokCount;
        private Double successRate;
    }
}