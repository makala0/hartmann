package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.*;
import cz.amv.hartmann.dto.*;
import cz.amv.hartmann.repository.BasicRecipeRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class BasicRecipeService {

    @Autowired
    private BasicRecipeRepository basicRecipeRepository;

    public Page<BasicRecipe> searchRecipes(RecipeFilter filter, Pageable pageable) {
        return basicRecipeRepository.findAll(toSpecification(filter), pageable);
    }

    public List<String> findAllCameras() {
        // Implementuj podle potřeby - zatím prázdné
        return List.of("Kamera 1", "Kamera 2", "Kamera 3");
    }

    public List<String> findAllStatuses() {
        return List.of("Ve výrobě", "Nezkontrolováno", "Dokončeno");
    }

    public List<String> findAllTypes() {
        return List.of("Jednotlivé", "Agregované");
    }

    private Specification<BasicRecipe> toSpecification(RecipeFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("startTime"),
                        filter.getDateFrom().atStartOfDay()
                ));
            }
            if (filter.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("startTime"),
                        filter.getDateTo().atTime(23, 59, 59)
                ));
            }
            if (filter.getDmCode() != null && !filter.getDmCode().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("batchId")),
                        "%" + filter.getDmCode().toLowerCase() + "%"
                ));
            }
            if (filter.getStatus() != null && !filter.getStatus().isEmpty()) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public BatchDetailDto getBatchDetail(Long recipeId) {
        BasicRecipe recipe = basicRecipeRepository.findById(recipeId)
                .orElseThrow(() -> new RuntimeException("Zakázka nenalezena: " + recipeId));

        recipe.calculateSummary();

        BatchDetailDto dto = new BatchDetailDto();

        // Vytvoř vnořený objekt recipe
        BatchDetailDto.RecipeDto recipeDto = new BatchDetailDto.RecipeDto();
        recipeDto.setId(recipe.getId());
        recipeDto.setBatchId(recipe.getBatchId());
        recipeDto.setStartTime(recipe.getStartTime().toString());
        recipeDto.setSpecification(recipe.getSpecification());
        recipeDto.setOkCount(recipe.getOkCount());
        recipeDto.setNokCount(recipe.getNokCount());
        recipeDto.setSuccessRate(recipe.getSuccessRate());

        dto.setRecipe(recipeDto);

        // Všechny produkty pro časovou osu
        List<ProductDto> productDtos = recipe.getProducts().stream()
                .map(this::mapToProductDto)
                .sorted(Comparator.comparing(ProductDto::getMeasuredAt))
                .collect(Collectors.toList());
        dto.setProducts(productDtos);

        // Spočítej statistiky
        dto.setTotalProducts(productDtos.size());
        dto.setOkProducts((int) productDtos.stream()
                .filter(p -> "OK".equals(p.getOverallResult()))
                .count());
        dto.setNokProducts((int) productDtos.stream()
                .filter(p -> "NOK".equals(p.getOverallResult()))
                .count());

        return dto;
    }

    private ProductDto mapToProductDto(Product product) {
        if (product == null) return null;

        ProductDto dto = new ProductDto();
        dto.setId(product.getId());
        dto.setMeasuredAt(product.getMeasuredAt());
        dto.setOverallResult(product.getOverallResult());
        dto.setStationResults(product.getStationResults().stream()
                .sorted(Comparator.comparing(StationResult::getStationNumber))
                .map(s -> {
                    StationResultDto sdto = new StationResultDto();
                    sdto.setStationNumber(s.getStationNumber());
                    sdto.setResult(s.getResult());
                    sdto.setSubResult(s.getSubResult());
                    sdto.setImagePaths(s.getImages().stream()
                            .map(InspectionImage::getImagePath)
                            .collect(Collectors.toList()));
                    return sdto;
                })
                .collect(Collectors.toList()));
        return dto;
    }

    private List<DefectDto> aggregateDefects(List<Product> products) {
        // Ukázkové defekty - později nahraď reálným výpočtem
        DefectDto d1 = new DefectDto();
        d1.setName("Pracovní pozice");
        d1.setCount(19);

        DefectDto d2 = new DefectDto();
        d2.setName("Nepočítáno");
        d2.setCount(15);

        DefectDto d3 = new DefectDto();
        d3.setName("Chybný signál");
        d3.setCount(12);

        DefectDto d4 = new DefectDto();
        d4.setName("Interní chyba");
        d4.setCount(48);

        DefectDto d5 = new DefectDto();
        d5.setName("Podélné řezy nevyhovují");
        d5.setCount(25);

        return List.of(d1, d2, d3, d4, d5);
    }
}