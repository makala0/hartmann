package cz.amv.hartmann.domain;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "product")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "recipe_id")
    private BasicRecipe recipe;  // Vazba na zakázku

    private LocalDateTime measuredAt;  // Datum a čas měření

    private String overallResult;  // Celkový výsledek: OK/NOK

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StationResult> stationResults = new ArrayList<>();  // 3 stanice
}