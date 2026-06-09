package cz.amv.hartmann.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OrderCommentForm {
    @Size(max = 4000, message = "Komentář může mít maximálně 4000 znaků")
    private String comment;
}
