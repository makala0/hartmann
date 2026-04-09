package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "inspection_image")
public class InspectionImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "station_id")
    private StationResult station;

    private String imagePath;  // Cesta k obrázku (např. "/images/abc.jpg")

    private String type;  // "Vše", "Stanice 1" atd.
}
