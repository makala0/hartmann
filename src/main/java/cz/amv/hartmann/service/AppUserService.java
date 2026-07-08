package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.AppUser;
import cz.amv.hartmann.dto.CriticalNotificationSettingsDto;
import cz.amv.hartmann.dto.RegisterForm;
import cz.amv.hartmann.repository.AppUserRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AppUserService implements UserDetailsService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AppUserService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void registerNewUser(RegisterForm form) {
        if (appUserRepository.existsByEmail(form.getEmail())) {
            throw new IllegalArgumentException("Uživatel s tímto e-mailem už existuje.");
        }

        AppUser appUser = new AppUser();
        appUser.setEmail(form.getEmail().trim().toLowerCase());
        appUser.setPassword(passwordEncoder.encode(form.getPassword()));
        appUserRepository.save(appUser);
    }

    public AppUser findByEmail(String email) {
        return appUserRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Uživatel nebyl nalezen."));
    }

    @Transactional(readOnly = true)
    public CriticalNotificationSettingsDto getCriticalNotificationSettings(String email) {
        AppUser appUser = findByEmail(email);

        CriticalNotificationSettingsDto settings = new CriticalNotificationSettingsDto();
        settings.setCriticalNotificationsEnabled(appUser.getCriticalNotificationsEnabled());
        settings.setCriticalNotificationEmails(List.copyOf(appUser.getCriticalNotificationEmails()));
        return settings;
    }

    @Transactional
    public CriticalNotificationSettingsDto updateCriticalNotificationSettings(
            String email,
            CriticalNotificationSettingsDto settings
    ) {
        AppUser appUser = findByEmail(email);
        appUser.setCriticalNotificationsEnabled(settings.isCriticalNotificationsEnabled());
        List<String> recipients = settings.getCriticalNotificationEmails() != null
                ? settings.getCriticalNotificationEmails()
                : List.of();
        appUser.setCriticalNotificationEmails(new ArrayList<>(recipients.stream()
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList()));

        return getCriticalNotificationSettings(email);
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        AppUser appUser = findByEmail(email);

        if (!passwordEncoder.matches(currentPassword, appUser.getPassword())) {
            throw new IllegalArgumentException("Aktuální heslo není správné.");
        }

        appUser.setPassword(passwordEncoder.encode(newPassword));
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser appUser = findByEmail(username);

        return User.builder()
            .username(appUser.getEmail())
            .password(appUser.getPassword())
            .roles(appUser.getRole().replace("ROLE_", ""))
            .build();
    }
}
