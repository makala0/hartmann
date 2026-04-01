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

    public List<String> findAllCameras() {
        return basicRecipeRepository.findAll().stream()
            .map(BasicRecipe::getCamera)
            .filter(camera -> camera != null && !camera.isBlank())
            .distinct()
            .sorted()
            .toList();
    }

    public List<String> findAllResults() {
        return basicRecipeRepository.findAll().stream()
            .map(BasicRecipe::getResult)
            .filter(result -> result != null && !result.isBlank())
            .distinct()
            .sorted()
            .toList();
    }

    private Specification<BasicRecipe> toSpecification(RecipeFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getQ() != null && !filter.getQ().isBlank()) {
                String likeQ = "%" + filter.getQ().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("recipe")), likeQ),
                    cb.like(cb.lower(root.get("EANCode")), likeQ),
                    cb.like(cb.lower(root.get("DMCode")), likeQ)
                ));
            }

            if (filter.getCamera() != null && !filter.getCamera().isBlank()) {
                predicates.add(cb.equal(root.get("camera"), filter.getCamera().trim()));
            }

            if (filter.getResult() != null && !filter.getResult().isBlank()) {
                predicates.add(cb.equal(root.get("result"), filter.getResult().trim()));
            }

            if (filter.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), filter.getDateFrom()));
            }

            if (filter.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), filter.getDateTo()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
