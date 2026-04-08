package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.BasicRecipe;
import cz.amv.hartmann.dto.RecipeFilter;
import cz.amv.hartmann.repository.BasicRecipeRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class BasicRecipeService {

    private final BasicRecipeRepository basicRecipeRepository;

    public BasicRecipeService(BasicRecipeRepository basicRecipeRepository) {
        this.basicRecipeRepository = basicRecipeRepository;
    }

    public Page<BasicRecipe> searchRecipes(RecipeFilter filter, Pageable pageable) {
        return basicRecipeRepository.findAll(toSpecification(filter), pageable);
    }

    public List<String> findAllStatuses() {
        return basicRecipeRepository.findAll().stream()
            .map(BasicRecipe::getResult)
            .filter(result -> result != null && !result.isBlank())
            .distinct()
            .sorted()
            .toList();
    }

    public List<String> findAllTypes() {
        return basicRecipeRepository.findAll().stream()
            .map(BasicRecipe::getRecipe)
            .filter(type -> type != null && !type.isBlank())
            .distinct()
            .sorted()
            .toList();
    }

    private Specification<BasicRecipe> toSpecification(RecipeFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), filter.getDateFrom()));
            }

            if (filter.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), filter.getDateTo()));
            }

            if (filter.getOrderNumber() != null && !filter.getOrderNumber().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("EANCode")), "%" + filter.getOrderNumber().trim().toLowerCase() + "%"));
            }

            if (filter.getStatus() != null && !filter.getStatus().isBlank()) {
                predicates.add(cb.equal(root.get("result"), filter.getStatus().trim()));
            }

            if (filter.getType() != null && !filter.getType().isBlank()) {
                predicates.add(cb.equal(root.get("recipe"), filter.getType().trim()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
