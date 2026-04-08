package cz.amv.hartmann.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ChangePasswordForm {

    @NotBlank(message = "Aktuální heslo je povinné")
    private String currentPassword;

    @NotBlank(message = "Nové heslo je povinné")
    @Size(min = 8, message = "Nové heslo musí mít alespoň 8 znaků")
    private String newPassword;

    @NotBlank(message = "Potvrzení hesla je povinné")
    private String confirmNewPassword;

    public String getCurrentPassword() {
        return currentPassword;
    }

    public void setCurrentPassword(String currentPassword) {
        this.currentPassword = currentPassword;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }

    public String getConfirmNewPassword() {
        return confirmNewPassword;
    }

    public void setConfirmNewPassword(String confirmNewPassword) {
        this.confirmNewPassword = confirmNewPassword;
    }
}
