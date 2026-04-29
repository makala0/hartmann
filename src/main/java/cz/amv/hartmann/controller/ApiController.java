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

        Map<String, Object> response = new HashMap<>();
        response.put("content", recipePage.getContent());
        response.put("totalElements", recipePage.getTotalElements());
        response.put("totalPages", recipePage.getTotalPages());
        response.put("currentPage", recipePage.getNumber());
        response.put("size", recipePage.getSize());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        Map<String, Object> stats = orderService.getDashboardStats();
        return ResponseEntity.ok(stats);
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
    public ResponseEntity<?> getOrderDetailWithItems(@PathVariable Long id) {
        try {
            OrderDetailWithItemsDto detail = this.orderService.getOrderDetailWithItems(id);
            return ResponseEntity.ok(detail);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
