package cz.amv.hartmann.dto;

import cz.amv.hartmann.domain.AppUser;

public record AppUserDto(Long id, String email, String role) {

    public static AppUserDto from(AppUser appUser) {
        return new AppUserDto(appUser.getId(), appUser.getEmail(), appUser.getRole());
    }
}
