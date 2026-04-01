package cz.amv.hartmann.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Setter
@Getter
public class BasicRecipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String camera;

    @Column(nullable = false)
    private String result;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String EANCode;

    @Column(nullable = false)
    private String DMCode;

    @Column(nullable = false)
    private String recipe;

    private byte[] image;
}
