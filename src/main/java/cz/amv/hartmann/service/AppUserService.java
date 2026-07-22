package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.AppUser;
import cz.amv.hartmann.dto.AppUserDto;
import cz.amv.hartmann.dto.CriticalNotificationSettingsDto;
import cz.amv.hartmann.dto.RegisterForm;
import cz.amv.hartmann.repository.AppUserRepository;
import java.util.List;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

@Service
public class AppUserService implements UserDetailsService {

    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_WORKER = "ROLE_WORKER";
    public static final String ROLE_SERVICE = "ROLE_SERVICE";

    private static final List<String> MANAGER_ROLES = List.of(ROLE_ADMIN, ROLE_SERVICE);
    private static final List<String> ALLOWED_ROLES = List.of(ROLE_ADMIN, ROLE_WORKER, ROLE_SERVICE);

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AppUserService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AppUserDto registerNewUser(RegisterForm form) {
        if (appUserRepository.existsByEmail(form.getEmail().trim().toLowerCase())) {
            throw new IllegalArgumentException("Uživatel s tímto e-mailem už existuje.");
        }

        AppUser appUser = new AppUser();
        appUser.setEmail(form.getEmail().trim().toLowerCase());
        appUser.setPassword(passwordEncoder.encode(form.getPassword()));
        appUser.setRole(resolveRole(form.getRole()));
        return AppUserDto.from(appUserRepository.save(appUser));
    }

    public List<AppUserDto> findAllUsers() {
        return appUserRepository.findAll().stream()
            .map(AppUserDto::from)
            .toList();
    }

    @Transactional
    public void deleteUser(Long id, String currentUserEmail) {
        AppUser appUser = appUserRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Uživatel nebyl nalezen."));

        if (appUser.getEmail().equalsIgnoreCase(currentUserEmail)) {
            throw new IllegalArgumentException("Nemůžete odebrat vlastní účet.");
        }

        appUserRepository.delete(appUser);
    }

    public boolean hasAnyManager() {
        return appUserRepository.countByRoleIn(MANAGER_ROLES) > 0;
    }

    public boolean isManager(UserDetails userDetails) {
        if (userDetails == null) {
            return true;
        }

        return !MANAGER_ROLES.contains(getRoleByEmail(userDetails.getUsername()));
    }

    public String getRoleByEmail(String email) {
        return normalizeLegacyRole(findByEmail(email).getRole());
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
            .roles(normalizeLegacyRole(appUser.getRole()).replace("ROLE_", ""))
            .build();
    }

    private String resolveRole(String role) {
        String normalizedRole = role == null || role.isBlank() ? ROLE_WORKER : role;
        if (!normalizedRole.startsWith("ROLE_")) {
            normalizedRole = "ROLE_" + normalizedRole;
        }
        normalizedRole = normalizeLegacyRole(normalizedRole.toUpperCase());

        if (!ALLOWED_ROLES.contains(normalizedRole)) {
            throw new IllegalArgumentException("Neplatná role uživatele.");
        }

        return normalizedRole;
    }

    private String normalizeLegacyRole(String role) {
        return "ROLE_USER".equals(role) ? ROLE_WORKER : role;
    }
}
