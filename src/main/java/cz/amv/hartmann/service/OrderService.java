package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.*;
import cz.amv.hartmann.dto.*;
import cz.amv.hartmann.repository.DefectRepository;
import cz.amv.hartmann.repository.ItemRepository;
import cz.amv.hartmann.repository.OrderRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final DefectRepository defectRepository;
    private final AppUserService appUserService;
    private final CriticalItemNotificationService criticalItemNotificationService;

    public OrderService(
            OrderRepository orderRepository,
            ItemRepository itemRepository,
            DefectRepository defectRepository,
            AppUserService appUserService,
            CriticalItemNotificationService criticalItemNotificationService
    ) {
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
        this.defectRepository = defectRepository;
        this.appUserService = appUserService;
        this.criticalItemNotificationService = criticalItemNotificationService;
    }

    public Map<String, Object> getDashboardStats(List<Order> filteredOrders, long totalRecipes) {
        List<ItemRepository.ItemResultStats> itemStats = getItemStatsForOrders(filteredOrders);
        Map<Long, ItemRepository.ItemResultStats> itemStatsByOrderNumber = itemStats.stream()
                .collect(Collectors.toMap(ItemRepository.ItemResultStats::getOrderNumber, stats -> stats));

        applyStatValues(filteredOrders, itemStatsByOrderNumber);

        long totalOkCount = itemStats.stream()
                .mapToLong(ItemRepository.ItemResultStats::getOkCount)
                .sum();

        long totalNokCount = itemStats.stream()
                .mapToLong(ItemRepository.ItemResultStats::getNokCount)
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("okCount", totalOkCount);
        stats.put("nokCount", totalNokCount);
        stats.put("totalRecipes", totalRecipes);

        return stats;
    }

    private List<ItemRepository.ItemResultStats> getItemStatsForOrders(List<Order> orders) {
        List<Long> orderNumbers = orders.stream()
                .map(Order::getOrderNumber)
                .toList();

        if (orderNumbers.isEmpty()) {
            return List.of();
        }

        return this.itemRepository.getResultStatsByOrderNumbers(orderNumbers);
    }

    private void applyStatValues(
            List<Order> orders,
            Map<Long, ItemRepository.ItemResultStats> itemStatsByOrderNumber
    ) {
        for (Order order : orders) {
            ItemRepository.ItemResultStats itemStats = itemStatsByOrderNumber.get(order.getOrderNumber());
            long totalOkCount = itemStats != null ? itemStats.getOkCount() : 0L;
            long totalNokCount = itemStats != null ? itemStats.getNokCount() : 0L;
            long totalReworkCount = itemStats != null ? itemStats.getReworkCount() : 0L;
            long totalCount = itemStats != null ? itemStats.getTotalCount() : 0L;

            order.setOkCount(totalOkCount);
            order.setNokCount(totalNokCount);
            order.setReworkCount(totalReworkCount);
            order.setTotalCount(totalCount);
            order.setOkPercentage(totalCount > 0 ? (totalOkCount * 100.0) / totalCount : 0.0);
        }
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

    public Map<String, Object> findScannedItem(Long orderNumber) {
        Order order = orderRepository.findFirstByOrderNumber(orderNumber)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena pro kód: " + orderNumber));
        Item item = itemRepository.findFirstByOrderNumberOrderByEndInspectionTimeDesc(orderNumber)
                .orElseThrow(() -> new RuntimeException("Kus nenalezen pro kód: " + orderNumber));

        Map<String, Object> result = new HashMap<>();
        result.put("orderId", order.getId());
        result.put("item", convertToDtoWithDefects(item));
        return result;
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

    public Page<ItemDto> searchItems(ItemFilter filter, Pageable pageable) {
        Page<Item> itemPage = itemRepository.findAll(toItemSpecification(null, filter), pageable);
        return new PageImpl<>(convertToDtos(itemPage.getContent()), pageable, itemPage.getTotalElements());
    }

    public Page<Item> searchItemsInOrder(Long orderId, ItemFilter filter, Pageable pageable) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        return itemRepository.findAll(toItemSpecification(order.getOrderNumber(), filter), pageable);
    }

    private Specification<Item> toItemSpecification(Long orderNumber, ItemFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (orderNumber != null) {
                predicates.add(cb.equal(root.get("orderNumber"), orderNumber));
            }

            if (filter.getOrderId() != null && filter.getOrderId() != 0L) {
                predicates.add(cb.equal(root.get("orderId"), filter.getOrderId()));
            }

            if (filter.getAttentionFlag() != null) {
                predicates.add(cb.equal(root.get("attentionFlag"), filter.getAttentionFlag()));
            }

            if (filter.getCriticalFlag() != null) {
                predicates.add(cb.equal(root.get("criticalFlag"), filter.getCriticalFlag()));
            }

            if (filter.getDefectType() != null && !filter.getDefectType().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("defectType")),
                        "%" + filter.getDefectType().toLowerCase() + "%"
                ));
            }

            if (filter.getTotalResult() != null && !filter.getTotalResult().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("totalResult")), filter.getTotalResult().toLowerCase()));
            }

            if (filter.getCameraNumber() != null) {
                predicates.add(cb.equal(root.get("cameraNumber"), filter.getCameraNumber().shortValue()));
            }

            if (filter.getSerialNumber() != null && !filter.getSerialNumber().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("serialNumber")),
                        "%" + filter.getSerialNumber().toLowerCase() + "%"
                ));
            }

            if (filter.getItemId() != null && !filter.getItemId().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("itemId")),
                        "%" + filter.getItemId().toLowerCase() + "%"
                ));
            }

            if (filter.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("endInspectionTime"),
                        filter.getDateFrom().atStartOfDay().toInstant(java.time.ZoneOffset.UTC)
                ));
            }

            if (filter.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("endInspectionTime"),
                        filter.getDateTo().atTime(23, 59, 59).toInstant(java.time.ZoneOffset.UTC)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public OrderDetailWithItemsDto getOrderDetailWithItems(Long orderId, ItemFilter filter, Pageable pageable) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        long okCount = itemRepository.countByOrderNumberAndTotalResultIgnoreCase(order.getOrderNumber(), "OK");
        long nokCount = itemRepository.countByOrderNumberAndTotalResultIgnoreCase(order.getOrderNumber(), "NOK");
        long reworkCount = itemRepository.countByOrderNumberAndTotalResultIgnoreCase(order.getOrderNumber(), "REWORK");
        long totalCount = itemRepository.countByOrderNumber(order.getOrderNumber());
        Page<Item> itemPage = itemRepository.findAll(toItemSpecification(order.getOrderNumber(), filter), pageable);

        OrderDetailWithItemsDto result = new OrderDetailWithItemsDto();
        result.setId(order.getId());
        result.setOrderId(order.getOrderId());
        result.setOrderNumber(order.getOrderNumber().toString());
        result.setRef(order.getRef());
        result.setSku(order.getSku());
        result.setOkCount(okCount);
        result.setNokCount(nokCount);
        result.setReworkCount(reworkCount);
        result.setTotalCount(totalCount);
        result.setOkPercentage(totalCount > 0 ? (double) (okCount * 100 / totalCount) : 0.0);
        result.setOrderBeginDate(order.getOrderBeginDate());
        result.setLineType(order.getLineType());
        result.setRecipe(order.getRecipe());
        result.setComment(order.getComment());
        result.setItems(convertToDtos(itemPage.getContent()));
        result.setTotalElements(itemPage.getTotalElements());
        result.setTotalPages(itemPage.getTotalPages());
        result.setCurrentPage(itemPage.getNumber());
        result.setSize(itemPage.getSize());

        return result;
    }

    public OrderDetailWithItemsDto updateOrderComment(Long orderId, String comment) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        order.setComment(comment);
        orderRepository.saveAndFlush(order);
        ItemFilter filter = new ItemFilter();
        filter.setDefectType("");
        filter.setTotalResult("");
        filter.setCameraNumber(null);
        filter.setDateFrom(null);
        filter.setDateTo(null);
        filter.setSerialNumber("");
        filter.setItemId("");
        Pageable pageable = PageRequest.of(1, 10, Sort.by("endInspectionTime").descending());

        return getOrderDetailWithItems(orderId, filter, pageable);
    }

    @Transactional
    public ItemDto updateItemFlags(Long itemId, Boolean attentionFlag, Boolean criticalFlag, String changedByEmail) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Kus nenalezen: " + itemId));
        boolean wasCritical = Boolean.TRUE.equals(item.getCriticalFlag());
        boolean shouldBeCritical = Boolean.TRUE.equals(criticalFlag);

        item.setAttentionFlag(Boolean.TRUE.equals(attentionFlag));
        item.setCriticalFlag(shouldBeCritical);

        Item savedItem = itemRepository.saveAndFlush(item);
        if (!wasCritical && shouldBeCritical) {
//            criticalItemNotificationService.notifyCriticalFlagEnabled(
//                    savedItem,
//                    appUserService.findByEmail(changedByEmail)
//            );
        }

        return convertToDtoWithDefects(savedItem);
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
        dto.setAttentionFlag(item.getAttentionFlag());
        dto.setCriticalFlag(item.getCriticalFlag());
        dto.setDefects(List.of());
        return dto;
    }

    private ItemDto convertToDtoWithDefects(Item item) {
        ItemDto dto = convertToDto(item);
        dto.setDefects(defectRepository.findByItemIdIn(List.of(item.getItemId())).stream()
                .map(this::convertToDto)
                .toList());
        return dto;
    }

    private List<ItemDto> convertToDtos(List<Item> items) {
        List<ItemDto> itemDtos = items.stream().map(this::convertToDto).collect(Collectors.toList());
        List<String> itemIds = items.stream().map(Item::getItemId).toList();
        Map<String, List<DefectDto>> defectsByItemId = itemIds.isEmpty()
                ? Map.of()
                : defectRepository.findByItemIdIn(itemIds).stream()
                .map(this::convertToDto)
                .collect(Collectors.groupingBy(DefectDto::getItemId));

        itemDtos.forEach(itemDto -> itemDto.setDefects(
                defectsByItemId.getOrDefault(itemDto.getItemId(), List.of())
        ));

        return itemDtos;
    }

    private DefectDto convertToDto(Defect defect) {
        DefectDto dto = new DefectDto();
        dto.setId(defect.getId());
        dto.setItemId(defect.getItemId());
        dto.setPositionX(defect.getPositionX());
        dto.setPositionY(defect.getPositionY());
        dto.setWidth(defect.getWidth());
        dto.setHeight(defect.getHeight());
        dto.setStation(defect.getStation());
        dto.setType(defect.getType());
        return dto;
    }
}
