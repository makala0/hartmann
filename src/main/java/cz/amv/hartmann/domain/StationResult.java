package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "station_result")
public class StationResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    private Integer stationNumber;  // 1, 2 nebo 3

    private String result;  // OK/NOK

    private String subResult;  // Podrobnější info, např. "Vše OK"

    @OneToMany(mappedBy = "station", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InspectionImage> images = new ArrayList<>();  // Obrázky z kamery
}
