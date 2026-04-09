package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "defect")
public class Defect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;  // Např. "DEF001"

    private String name;  // Ukázkové: "Špatný signál", "Obrys chyba", "Neúplný produkt", "Přebytečný materiál", "Jiný defekt"

    private Integer count;  // Počet výskytů v zakázce
}
