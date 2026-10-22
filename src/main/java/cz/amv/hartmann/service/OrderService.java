package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.*;
import cz.amv.hartmann.dto.*;
import cz.amv.hartmann.repository.ItemRepository;
import cz.amv.hartmann.repository.OrderRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final AppUserService appUserService;
    private final CriticalItemNotificationService criticalItemNotificationService;
    private final ItemInspectionMapper inspectionMapper;
    private final ItemClassificationIndexer classificationIndexer;

    public OrderService(
            OrderRepository orderRepository,
            ItemRepository itemRepository,
            AppUserService appUserService,
            CriticalItemNotificationService criticalItemNotificationService,
            ItemInspectionMapper inspectionMapper,
            ItemClassificationIndexer classificationIndexer
    ) {
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
        this.appUserService = appUserService;
        this.criticalItemNotificationService = criticalItemNotificationService;
        this.inspectionMapper = inspectionMapper;
        this.classificationIndexer = classificationIndexer;
    }

    public Map<String, Object> getDashboardStats(List<Order> filteredOrders, long totalRecipes) {
        List<ItemRepository.ItemResultStats> itemStats = getItemStatsForOrders(filteredOrders);
        Map<Long, ItemRepository.ItemResultStats> itemStatsByOrderId = itemStats.stream()
                .collect(Collectors.toMap(ItemRepository.ItemResultStats::getOrderId, stats -> stats));

        applyStatValues(filteredOrders, itemStatsByOrderId);

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
        List<Long> orderIds = orders.stream()
                .map(Order::getOrderId)
                .toList();

        if (orderIds.isEmpty()) {
            return List.of();
        }

        return this.itemRepository.getResultStatsByOrderIds(orderIds);
    }

    private void applyStatValues(
            List<Order> orders,
            Map<Long, ItemRepository.ItemResultStats> itemStatsByOrderId
    ) {
        for (Order order : orders) {
            ItemRepository.ItemResultStats itemStats = itemStatsByOrderId.get(order.getOrderId());
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

    public Map<String, Object> findScannedItem(Long orderId) {
        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena pro kód: " + orderId));
        Item item = itemRepository.findFirstByOrderIdOrderByEndInspectionTimeDescIdDesc(orderId)
                .orElseThrow(() -> new RuntimeException("Kus nenalezen pro kód: " + orderId));

        Map<String, Object> result = new HashMap<>();
        result.put("orderId", order.getId());
        result.put("item", convertToDtoWithDefects(item));
        return result;
    }

    public OrderDetailDto getOrderDetail(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        List<Item> items = itemRepository.findByOrderId(order.getOrderId());

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
        prepareClassificationFilter(filter);
        Page<Item> itemPage = itemRepository.findAll(toItemSpecification(null, filter), pageable);
        return new PageImpl<>(convertToDtos(itemPage.getContent()), pageable, itemPage.getTotalElements());
    }

    public Page<Item> searchItemsInOrder(Long orderId, ItemFilter filter, Pageable pageable) {
        prepareClassificationFilter(filter);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        return itemRepository.findAll(toItemSpecification(order.getOrderId(), filter), pageable);
    }

    private void prepareClassificationFilter(ItemFilter filter) {
        if (filter.getMainDefectCode() != null && !filter.getMainDefectCode().isBlank()) classificationIndexer.catchUp();
    }

    private Specification<Item> toItemSpecification(Long orderId, ItemFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getMainDefectCode() != null && !filter.getMainDefectCode().isBlank()) {
                var latest = query.subquery(Long.class);
                var history = latest.from(ItemClassification.class);
                latest.select(cb.max(history.<Long>get("id"))).where(cb.equal(history.get("itemRecordId"), root.get("id")));
                var matched = query.subquery(Long.class);
                var snapshot = matched.from(ItemClassification.class);
                matched.select(snapshot.get("id")).where(
                        cb.equal(snapshot.get("id"), latest),
                        cb.equal(snapshot.get("itemRecordId"), root.get("id")),
                        cb.equal(cb.upper(snapshot.get("code")), filter.getMainDefectCode().trim().toUpperCase(java.util.Locale.ROOT)));
                predicates.add(cb.exists(matched));
                var identityCount = query.subquery(Long.class);
                var identity = identityCount.from(Item.class);
                identityCount.select(cb.count(identity)).where(cb.equal(identity.get("itemId"), root.get("itemId")));
                predicates.add(cb.equal(identityCount, 1L));
            }

            if (orderId != null) {
                predicates.add(cb.equal(root.get("orderId"), orderId));
            }

            if (filter.getOrderId() != null && filter.getOrderId() != 0L) {
                predicates.add(cb.equal(root.get("orderId"), filter.getOrderId()));
            }

            if (filter.getSku() != null && !filter.getSku().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("sku")),
                        "%" + filter.getSku().toLowerCase(java.util.Locale.ROOT) + "%"));
            }

            if (filter.getRef() != null && !filter.getRef().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("ref")),
                        "%" + filter.getRef().toLowerCase(java.util.Locale.ROOT) + "%"));
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
        prepareClassificationFilter(filter);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Objednávka nenalezena: " + orderId));

        long okCount = itemRepository.countByOrderIdAndTotalResultIgnoreCase(order.getOrderId(), "OK");
        long nokCount = itemRepository.countByOrderIdAndTotalResultIgnoreCase(order.getOrderId(), "NOK");
        long reworkCount = itemRepository.countByOrderIdAndTotalResultIgnoreCase(order.getOrderId(), "REWORK");
        long totalCount = itemRepository.countByOrderId(order.getOrderId());
        Page<Item> itemPage = itemRepository.findAll(toItemSpecification(order.getOrderId(), filter), pageable);

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
        boolean wasWarning = Boolean.TRUE.equals(item.getAttentionFlag());
        boolean shouldBeWarning = Boolean.TRUE.equals(attentionFlag);
        boolean wasCritical = Boolean.TRUE.equals(item.getCriticalFlag());
        boolean shouldBeCritical = Boolean.TRUE.equals(criticalFlag);

        item.setAttentionFlag(shouldBeWarning);
        item.setCriticalFlag(shouldBeCritical);

        item.setWarningNotificationSent(wasWarning || !shouldBeWarning);
        item.setCriticalNotificationSent(wasCritical || !shouldBeCritical);

        Item savedItem = itemRepository.saveAndFlush(item);
        if (!wasCritical && shouldBeCritical) {
            boolean notificationSent = criticalItemNotificationService.notifyCriticalFlagEnabled(
                    savedItem,
                    appUserService.findByEmail(changedByEmail)
            );
            savedItem.setCriticalNotificationSent(notificationSent);
            savedItem = itemRepository.saveAndFlush(savedItem);
        }

        return convertToDtoWithDefects(savedItem);
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void sendPendingWarningNotifications() {
        List<Item> pendingItems = itemRepository.findByAttentionFlagTrueAndWarningNotificationSentFalse();

        for (Item item : pendingItems) {
            boolean notificationSent = criticalItemNotificationService.notifyWarningFlagEnabled(item);
            if (notificationSent) {
                item.setWarningNotificationSent(true);
            }
        }

        itemRepository.saveAllAndFlush(pendingItems);
    }

    @Transactional(readOnly = true)
    public List<ItemDto> findPendingCriticalNotifications() {
        return itemRepository.findByCriticalFlagTrueAndCriticalNotificationSentFalse().stream()
                .map(this::convertToDto)
                .toList();
    }

    @Transactional
    public List<ItemDto> sendPendingCriticalNotifications(String changedByEmail) {
        AppUser user = appUserService.findByEmail(changedByEmail);
        List<Item> pendingItems = itemRepository.findByCriticalFlagTrueAndCriticalNotificationSentFalse();

        for (Item item : pendingItems) {
            boolean notificationSent = criticalItemNotificationService.notifyCriticalFlagEnabled(item, user);
            if (notificationSent) {
                item.setCriticalNotificationSent(true);
            }
        }

        return itemRepository.saveAllAndFlush(pendingItems).stream()
                .map(this::convertToDto)
                .toList();
    }

    @Transactional
    public ItemDto updateItemComment(Long id, String comment) {
        Item item = itemRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Kus nenalezen"));
        item.setComment(comment);
        return convertToDtoWithDefects(itemRepository.saveAndFlush(item));
    }

    private ItemDto convertToDto(Item item) { return inspectionMapper.convertToDto(item); }
    private ItemDto convertToDtoWithDefects(Item item) { return inspectionMapper.convertToDtoWithDefects(item); }
    public List<ItemDto> convertToDtos(List<Item> items) { return inspectionMapper.convertToDtos(items); }
}
