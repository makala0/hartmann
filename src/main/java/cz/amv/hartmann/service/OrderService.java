package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.*;
import cz.amv.hartmann.dto.*;
import cz.amv.hartmann.repository.ItemRepository;
import cz.amv.hartmann.repository.OrderRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;

    public OrderService(OrderRepository orderRepository, ItemRepository itemRepository) {
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
    }

    public Map<String, Object> getDashboardStats() {
        List<Order> allOrders = orderRepository.findAll();

        long totalOkCount = allOrders.stream()
                .mapToLong(Order::getOkCount)
                .sum();

        long totalNokCount = allOrders.stream()
                .mapToLong(Order::getNokCount)
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("okCount", totalOkCount);
        stats.put("nokCount", totalNokCount);
        stats.put("totalRecipes", allOrders.size());

        return stats;
    }

    public Page<Order> searchRecipes(OrderFilter filter, Pageable pageable) {
        return orderRepository.findAll(toSpecification(filter), pageable);
    }

    public List<String> findAllTypes() {
        return List.of("Jednotlivé", "Agregované");
    }

    private Specification<Order> toSpecification(OrderFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("orderBeginDate"),
                        filter.getDateFrom().atStartOfDay()
                ));
            }

            if (filter.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("orderBeginDate"),
                        filter.getDateTo().atTime(23, 59, 59)
                ));
            }

            if (filter.getLineType() != null && !filter.getLineType().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("lineType")),
                        "%" + filter.getLineType().toLowerCase() + "%"
                ));
            }

            if (filter.getOrderId() != null && filter.getOrderId() != 0L) {
                predicates.add(cb.equal(root.get("orderId"), filter.getOrderId()));
            }

            if (filter.getOrderNumber() != null && filter.getOrderNumber() != 0L) {
                predicates.add(cb.equal(root.get("orderNumber"), filter.getOrderNumber()));
            }

            if (filter.getSku() != null && !filter.getSku().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("sku")),
                        "%" + filter.getSku().toLowerCase() + "%"
                ));
            }

            if (filter.getRef() != null && !filter.getRef().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("ref")),
                        "%" + filter.getRef().toLowerCase() + "%"
                ));
            }

            if (filter.getRecipe() != null && !filter.getRecipe().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("recipe")),
                        "%" + filter.getRecipe().toLowerCase() + "%"
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public OrderDetailDto getOrderDetail(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        List<Item> items = itemRepository.findByOrderNumber(order.getOrderNumber());

        // Výpočet souhrných statistik
        long okCount = items.stream()
                .filter(item -> "OK".equalsIgnoreCase(item.getTotalResult()))
                .count();

        long nokCount = items.stream()
                .filter(item -> "NOK".equalsIgnoreCase(item.getTotalResult()))
                .count();

        long reworkCount = items.stream()
                .filter(item -> "REWORK".equalsIgnoreCase(item.getTotalResult()))
                .count();

        order.setOkCount(okCount);
        order.setNokCount(nokCount);
        order.setReworkCount(reworkCount);
        order.setTotalCount(okCount + nokCount + reworkCount);
        order.setOkPercentage(order.getTotalCount() > 0 ? (double) (okCount * 100 / order.getTotalCount()) : 0.0);

        OrderDetailDto detail = new OrderDetailDto();
        detail.setOrder(order);
        detail.setItems(items);
        detail.setTotalItems((int) (okCount + nokCount + reworkCount));
        detail.setOkItems((int) okCount);
        detail.setNokItems((int) nokCount);
        detail.setReworkItems((int) reworkCount);

        return detail;
    }

    public Page<Item> searchItemsInOrder(Long orderId, ItemFilter filter, Pageable pageable) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        List<Item> allItems = itemRepository.findByOrderNumber(order.getOrderNumber());

        // Aplikovat filtry
        List<Item> filteredItems = allItems.stream()
                .filter(item -> {
                    if (filter.getDefectType() != null && !filter.getDefectType().isEmpty()) {
                        return item.getDefectType().toLowerCase().contains(filter.getDefectType().toLowerCase());
                    }
                    return true;
                })
                .filter(item -> {
                    if (filter.getTotalResult() != null && !filter.getTotalResult().isEmpty()) {
                        return filter.getTotalResult().equalsIgnoreCase(item.getTotalResult());
                    }
                    return true;
                })
                .filter(item -> {
                    if (filter.getCameraNumber() != null) {
                        return Objects.equals(filter.getCameraNumber(), item.getCameraNumber().intValue());
                    }
                    return true;
                })
                .filter(item -> {
                    if (filter.getSerialNumber() != null && !filter.getSerialNumber().isEmpty()) {
                        return item.getSerialNumber().toLowerCase().contains(filter.getSerialNumber().toLowerCase());
                    }
                    return true;
                })
                .filter(item -> {
                    if (filter.getItemId() != null && !filter.getItemId().isEmpty()) {
                        return item.getItemId().toLowerCase().contains(filter.getItemId().toLowerCase());
                    }
                    return true;
                })
                .filter(item -> {
                    if (filter.getDateFrom() != null) {
                        return item.getEndInspectionTime().isAfter(filter.getDateFrom().atStartOfDay().toInstant(java.time.ZoneOffset.UTC));
                    }
                    return true;
                })
                .filter(item -> {
                    if (filter.getDateTo() != null) {
                        return item.getEndInspectionTime().isBefore(filter.getDateTo().atTime(23, 59, 59).toInstant(java.time.ZoneOffset.UTC));
                    }
                    return true;
                })
                .sorted((a, b) -> b.getEndInspectionTime().compareTo(a.getEndInspectionTime()))
                .collect(Collectors.toList());

        // Stránkování
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filteredItems.size());
        List<Item> pageContent = filteredItems.subList(start, end);

        return new PageImpl<>(pageContent, pageable, filteredItems.size());
    }

    public OrderDetailWithItemsDto getOrderDetailWithItems(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        List<Item> items = itemRepository.findByOrderNumber(order.getOrderNumber());

        // Výpočet souhrných statistik
        long okCount = items.stream()
                .filter(item -> "OK".equalsIgnoreCase(item.getTotalResult()))
                .count();

        long nokCount = items.stream()
                .filter(item -> "NOK".equalsIgnoreCase(item.getTotalResult()))
                .count();

        long reworkCount = items.stream()
                .filter(item -> "REWORK".equalsIgnoreCase(item.getTotalResult()))
                .count();

        OrderDetailWithItemsDto result = new OrderDetailWithItemsDto();
        result.setId(order.getId());
        result.setOrderId(order.getOrderId());
        result.setOrderNumber(order.getOrderNumber().toString());
        result.setRef(order.getRef());
        result.setSku(order.getSku());
        result.setOkCount(okCount);
        result.setNokCount(nokCount);
        result.setReworkCount(reworkCount);
        result.setTotalCount(okCount + nokCount + reworkCount);
        result.setOkPercentage(result.getTotalCount() > 0 ? (double) (okCount * 100 / result.getTotalCount()) : 0.0);
        result.setOrderBeginDate(order.getOrderBeginDate());
        result.setLineType(order.getLineType());
        result.setRecipe(order.getRecipe());

        List<ItemDto> itemDtos = items.stream().map(this::convertToDto).collect(Collectors.toList());
        result.setItems(itemDtos);

        return result;
    }

    private ItemDto convertToDto(Item item) {
        ItemDto dto = new ItemDto();
        dto.setId(item.getId());
        dto.setItemId(item.getItemId());
        dto.setSerialNumber(item.getSerialNumber());
        dto.setEndInspectionTime(item.getEndInspectionTime());
        dto.setSku(item.getSku());
        dto.setRef(item.getRef());
        dto.setOrderNumber(item.getOrderNumber());
        dto.setOrderId(item.getOrderId());
        dto.setCameraNumber(item.getCameraNumber());
        dto.setDefectType(item.getDefectType());
        dto.setTotalResult(item.getTotalResult());
        dto.setStation1Result(item.getStation1Result());
        dto.setStation2Result(item.getStation2Result());
        dto.setStation3Result(item.getStation3Result());
        dto.setStation1ImagePath(item.getStation1ImagePath());
        dto.setStation2ImagePath(item.getStation2ImagePath());
        dto.setStation3ImagePath(item.getStation3ImagePath());
        return dto;
    }
}
