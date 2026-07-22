package cz.amv.hartmann.controller;

import cz.amv.hartmann.domain.Item;
import cz.amv.hartmann.domain.Order;
import cz.amv.hartmann.dto.*;
import cz.amv.hartmann.service.AppUserService;
import cz.amv.hartmann.service.OrderService;
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ApiController {

    private final AppUserService appUserService;
    private final OrderService orderService;

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RegisterForm registerForm
    ) {
        if (appUserService.hasAnyManager() && !appUserService.isManager(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Účty může spravovat pouze Admin nebo Servis."));
        }

        try {
            if (!appUserService.hasAnyManager()) {
                registerForm.setRole(AppUserService.ROLE_ADMIN);
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Uživatel byl úspěšně vytvořen",
                    "user", appUserService.registerNewUser(registerForm)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(@AuthenticationPrincipal UserDetails userDetails) {
        if (!appUserService.isManager(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Seznam uživatelů může zobrazit pouze Admin nebo Servis."));
        }

        return ResponseEntity.ok(appUserService.findAllUsers());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id
    ) {
        if (!appUserService.isManager(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Účty může spravovat pouze Admin nebo Servis."));
        }

        try {
            appUserService.deleteUser(id, userDetails.getUsername());
            return ResponseEntity.ok(Map.of("message", "Uživatel byl odebrán"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/auth/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<String> authorities = userDetails.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .toList();

        String role = appUserService.getRoleByEmail(userDetails.getUsername());

        return ResponseEntity.ok(Map.of(
                "email", userDetails.getUsername(),
                "authorities", authorities,
                "role", role
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


    @GetMapping("/profile/critical-notifications")
    public ResponseEntity<?> getCriticalNotificationSettings(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(appUserService.getCriticalNotificationSettings(userDetails.getUsername()));
    }

    @PutMapping("/profile/critical-notifications")
    public ResponseEntity<?> updateCriticalNotificationSettings(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CriticalNotificationSettingsDto settings
    ) {
        return ResponseEntity.ok(appUserService.updateCriticalNotificationSettings(userDetails.getUsername(), settings));
    }

    @GetMapping("/dashboard/orders")
    public ResponseEntity<?> getOrders(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(defaultValue = "") String lineType,
            @RequestParam(defaultValue = "0") Long orderId,
            @RequestParam(defaultValue = "0") Long orderNumber,
            @RequestParam(defaultValue = "") String sku,
            @RequestParam(defaultValue = "") String ref,
            @RequestParam(defaultValue = "") String recipe,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        OrderFilter orderFilter = new OrderFilter();
        orderFilter.setLineType(lineType);
        orderFilter.setOrderId(orderId);
        orderFilter.setOrderNumber(orderNumber);
        orderFilter.setDateFrom(dateFrom);
        orderFilter.setDateTo(dateTo);
        orderFilter.setSku(sku);
        orderFilter.setRef(ref);
        orderFilter.setRecipe(recipe);

        Pageable pageable = PageRequest.of(page, size, Sort.by("orderBeginDate").descending());
        Page<Order> recipePage = this.orderService.searchRecipes(orderFilter, pageable);
        Map<String, Object> stats = this.orderService.getDashboardStats(
                recipePage.getContent(),
                recipePage.getTotalElements()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("content", recipePage.getContent());
        response.put("totalElements", recipePage.getTotalElements());
        response.put("totalPages", recipePage.getTotalPages());
        response.put("currentPage", recipePage.getNumber());
        response.put("size", recipePage.getSize());
        response.put("stats", stats);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard/items")
    public ResponseEntity<?> getItems(
            @RequestParam(defaultValue = "0") Long orderId,
            @RequestParam(required = false) Boolean attentionFlag,
            @RequestParam(required = false) Boolean criticalFlag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        ItemFilter filter = new ItemFilter();
        filter.setOrderId(orderId);
        filter.setAttentionFlag(attentionFlag);
        filter.setCriticalFlag(criticalFlag);

        Pageable pageable = PageRequest.of(page, size, Sort.by("endInspectionTime").descending());
        Page<ItemDto> itemPage = this.orderService.searchItems(filter, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("content", itemPage.getContent());
        response.put("totalElements", itemPage.getTotalElements());
        response.put("totalPages", itemPage.getTotalPages());
        response.put("currentPage", itemPage.getNumber());
        response.put("size", itemPage.getSize());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/dashboard/item/{id}/flags")
    public ResponseEntity<?> updateItemFlags(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Boolean> flags
    ) {
        try {
            ItemDto item = this.orderService.updateItemFlags(
                    id,
                    flags.get("attentionFlag"),
                    flags.get("criticalFlag"),
                    userDetails.getUsername()
            );
            return ResponseEntity.ok(item);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/dashboard/scan/{orderNumber}")
    public ResponseEntity<?> getScannedItem(@PathVariable Long orderNumber) {
        try {
            return ResponseEntity.ok(this.orderService.findScannedItem(orderNumber));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/dashboard/order/{id}")
    public ResponseEntity<?> getOrderDetail(@PathVariable Long id) {
        try {
            OrderDetailDto detail = this.orderService.getOrderDetail(id);
            return ResponseEntity.ok(detail);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/dashboard/order/{id}/comment")
    public ResponseEntity<?> updateOrderComment(
            @PathVariable Long id,
            @Valid @RequestBody OrderCommentForm form
    ) {
        try {
            OrderDetailWithItemsDto detail = this.orderService.updateOrderComment(id, form.getComment());
            return ResponseEntity.ok(detail);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/dashboard/order/{id}/items")
    public ResponseEntity<?> getOrderItems(
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String defectType,
            @RequestParam(defaultValue = "") String totalResult,
            @RequestParam(required = false) Integer cameraNumber,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(defaultValue = "") String serialNumber,
            @RequestParam(defaultValue = "") String itemId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        ItemFilter filter = new ItemFilter();
        filter.setDefectType(defectType);
        filter.setTotalResult(totalResult);
        filter.setCameraNumber(cameraNumber);
        filter.setDateFrom(dateFrom);
        filter.setDateTo(dateTo);
        filter.setSerialNumber(serialNumber);
        filter.setItemId(itemId);

        Pageable pageable = PageRequest.of(page, size, Sort.by("endInspectionTime").descending());
        Page<Item> itemPage = this.orderService.searchItemsInOrder(id, filter, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("content", itemPage.getContent());
        response.put("totalElements", itemPage.getTotalElements());
        response.put("totalPages", itemPage.getTotalPages());
        response.put("currentPage", itemPage.getNumber());
        response.put("size", itemPage.getSize());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard/filters")
    public ResponseEntity<?> getFilterOptions() {
        return ResponseEntity.ok(Map.of(
                "cameras", List.of("Kamera 1", "Kamera 2", "Kamera 3", "Kamera 4"),
                "statuses", List.of("OK", "NOK", "ERROR"),
                "types", orderService.findAllTypes()
        ));
    }

    @GetMapping("/dashboard/orderDetailWithItems/{id}")
    public ResponseEntity<?> getOrderDetailWithItems(
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String defectType,
            @RequestParam(defaultValue = "") String totalResult,
            @RequestParam(required = false) Integer cameraNumber,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(defaultValue = "") String serialNumber,
            @RequestParam(defaultValue = "") String itemId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        try {
            ItemFilter filter = new ItemFilter();
            filter.setDefectType(defectType);
            filter.setTotalResult(totalResult);
            filter.setCameraNumber(cameraNumber);
            filter.setDateFrom(dateFrom);
            filter.setDateTo(dateTo);
            filter.setSerialNumber(serialNumber);
            filter.setItemId(itemId);

            Pageable pageable = PageRequest.of(page, size, Sort.by("endInspectionTime").descending());
            OrderDetailWithItemsDto detail = this.orderService.getOrderDetailWithItems(id, filter, pageable);
            return ResponseEntity.ok(detail);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
