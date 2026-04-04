package cz.amv.hartmann.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;

@Entity
public class BasicRecipe {

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

    public Long getId() {
        return id;
    }

    public String getCamera() {
        return camera;
    }

    public void setCamera(String camera) {
        this.camera = camera;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getEANCode() {
        return EANCode;
    }

    public void setEANCode(String EANCode) {
        this.EANCode = EANCode;
    }

    public String getDMCode() {
        return DMCode;
    }

    public void setDMCode(String DMCode) {
        this.DMCode = DMCode;
    }

    public String getRecipe() {
        return recipe;
    }

    public void setRecipe(String recipe) {
        this.recipe = recipe;
    }

    public byte[] getImage() {
        return image;
    }

    public void setImage(byte[] image) {
        this.image = image;
    }
}
