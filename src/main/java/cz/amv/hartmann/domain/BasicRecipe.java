package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Setter
@Getter
@Table(name = "basic_recipe")
public class BasicRecipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime startTime;  // "Datum a čas počátku"

    @Column(nullable = false, unique = true)
    private String batchId;  // "Id dávky" - např. "206032T092232000"

    @Column(nullable = false)
    private String specification;  // "Specifikace" - např. "431876"

    private Integer okCount;  // Počet OK kusů
    private Integer nokCount;  // Počet NOK kusů
    private Integer totalCount;  // Vše (OK + NOK)
    private Double successRate;  // Procento úspěšnosti

    private String status;  // "Ve výrobě", "Nezkontrolováno", atd.

    // Pro detail - produkty v této zakázce
    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Product> products = new ArrayList<>();

    // Metoda pro přepočet souhrnných dat
    public void calculateSummary() {
        if (products == null || products.isEmpty()) {
            this.okCount = 0;
            this.nokCount = 0;
            this.totalCount = 0;
            this.successRate = 0.0;
            return;
        }
        this.okCount = (int) products.stream()
                .filter(p -> "OK".equals(p.getOverallResult()))
                .count();
        this.nokCount = products.size() - okCount;
        this.totalCount = products.size();
        this.successRate = okCount.doubleValue() / totalCount * 100;
    }
}