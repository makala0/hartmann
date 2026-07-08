package cz.amv.hartmann.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class CriticalNotificationSettingsDto {
    private boolean criticalNotificationsEnabled;
    private List<@NotBlank @Email String> criticalNotificationEmails = new ArrayList<>();
}
