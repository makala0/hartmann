package cz.amv.hartmann.controller;

import cz.amv.hartmann.dto.*;
import cz.amv.hartmann.domain.BasicRecipe;
import cz.amv.hartmann.service.AppUserService;
import cz.amv.hartmann.service.BasicRecipeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ApiController {

    private final AppUserService appUserService;
    private final BasicRecipeService basicRecipeService;

    // ===== AUTH ENDPOINTS =====

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterForm registerForm) {
        try {
            appUserService.registerNewUser(registerForm);
            return ResponseEntity.ok(Map.of("message", "Registrace proběhla úspěšně"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/auth/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(Map.of(
                "email", userDetails.getUsername(),
                "authorities", userDetails.getAuthorities()
        ));
    }

    @PostMapping("/auth/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordForm form
    ) {
        try {
            appUserService.changePassword(
                    userDetails.getUsername(),
                    form.getCurrentPassword(),
                    form.getNewPassword()
            );
            return ResponseEntity.ok(Map.of("message", "Heslo bylo úspěšně změněno"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // ===== DASHBOARD ENDPOINTS =====

    @GetMapping("/dashboard/recipes")
    public ResponseEntity<?> getRecipes(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(defaultValue = "") String eanCode,
            @RequestParam(defaultValue = "") String dmCode,
            @RequestParam(defaultValue = "") String camera,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        RecipeFilter filter = new RecipeFilter();
        filter.setDateFrom(dateFrom);
        filter.setDateTo(dateTo);
        filter.setEanCode(eanCode);
        filter.setDmCode(dmCode);
        filter.setCamera(camera);
        filter.setStatus(status);
        filter.setType(type);

        Pageable pageable = PageRequest.of(page, size, Sort.by("startTime").descending());
        Page<BasicRecipe> recipePage = basicRecipeService.searchRecipes(filter, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("content", recipePage.getContent());
        response.put("totalElements", recipePage.getTotalElements());
        response.put("totalPages", recipePage.getTotalPages());
        response.put("currentPage", recipePage.getNumber());
        response.put("size", recipePage.getSize());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getStats() {
        Page<BasicRecipe> allRecipes = basicRecipeService.searchRecipes(
                new RecipeFilter(),
                PageRequest.of(0, Integer.MAX_VALUE)
        );

        int okCount = allRecipes.getContent().stream()
                .mapToInt(r -> r.getOkCount() != null ? r.getOkCount() : 0)
                .sum();

        int nokCount = allRecipes.getContent().stream()
                .mapToInt(r -> r.getNokCount() != null ? r.getNokCount() : 0)
                .sum();

        return ResponseEntity.ok(Map.of(
                "okCount", okCount,
                "nokCount", nokCount,
                "totalRecipes", allRecipes.getTotalElements()
        ));
    }

    @GetMapping("/dashboard/filters")
    public ResponseEntity<?> getFilterOptions() {
        return ResponseEntity.ok(Map.of(
                "cameras", basicRecipeService.findAllCameras(),
                "statuses", basicRecipeService.findAllStatuses(),
                "types", basicRecipeService.findAllTypes()
        ));
    }

    @GetMapping("/dashboard/batch/{id}")
    public ResponseEntity<?> getBatchDetail(@PathVariable Long id) {
        try {
            BatchDetailDto detail = basicRecipeService.getBatchDetail(id);
            return ResponseEntity.ok(detail);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}