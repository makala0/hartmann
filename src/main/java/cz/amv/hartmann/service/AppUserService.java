package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.AppUser;
import cz.amv.hartmann.dto.RegisterForm;
import cz.amv.hartmann.repository.AppUserRepository;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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

    @Override
    public UserDetails loadUserByUsername(@NonNull String username) throws UsernameNotFoundException {
        AppUser appUser = appUserRepository.findByEmail(username)
            .orElseThrow(() -> new UsernameNotFoundException("Uživatel nebyl nalezen."));

        return User.builder()
            .username(appUser.getEmail())
            .password(appUser.getPassword())
            .roles(appUser.getRole().replace("ROLE_", ""))
            .build();
    }
}
