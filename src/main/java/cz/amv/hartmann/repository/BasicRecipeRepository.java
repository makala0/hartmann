package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.BasicRecipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BasicRecipeRepository extends JpaRepository<BasicRecipe, Long>, JpaSpecificationExecutor<BasicRecipe> {
}
