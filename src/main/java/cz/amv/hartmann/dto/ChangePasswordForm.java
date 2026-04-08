package cz.amv.hartmann.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class ChangePasswordForm {

    @NotBlank(message = "Aktuální heslo je povinné")
    private String currentPassword;

    @NotBlank(message = "Nové heslo je povinné")
    @Size(min = 8, message = "Nové heslo musí mít alespoň 8 znaků")
    private String newPassword;

    @NotBlank(message = "Potvrzení hesla je povinné")
    private String confirmNewPassword;
}
