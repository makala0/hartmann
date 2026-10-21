package cz.amv.hartmann;

import cz.amv.hartmann.domain.Item;
import cz.amv.hartmann.domain.Order;
import cz.amv.hartmann.repository.ItemRepository;
import cz.amv.hartmann.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrderItemPaginationTests {
    @Autowired MockMvc mvc;
    @Autowired OrderRepository orders;
    @Autowired ItemRepository items;
    @Autowired cz.amv.hartmann.service.OrderService orderService;

    @Test
    @WithMockUser
    void filtersAllOrderItemsBeforePagingAndKeepsStableOrdering() throws Exception {
        Order order = createOrder(123L);
        for (int i = 0; i < 50; i++) {
            createItem(123L, "kus-" + i, i % 2 == 0 ? "NOK" : "OK");
        }
        createItem(999L, "cizi-kus", "NOK");
        // All inspection times match: id must break ties across page boundaries.
        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", order.getId())
                        .param("totalResult", "NOK").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.items.length()").value(20))
                .andExpect(jsonPath("$.items[0].itemId").value("kus-48"))
                .andExpect(jsonPath("$.items[19].itemId").value("kus-10"))
                .andExpect(jsonPath("$.items[*].totalResult", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("NOK"))));
        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", order.getId())
                        .param("totalResult", "NOK").param("page", "1").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPage").value(1))
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.items[0].itemId").value("kus-8"))
                .andExpect(jsonPath("$.items[4].itemId").value("kus-0"));
        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", order.getId())
                        .param("totalResult", "NOK").param("serialNumber", "nenalezeno"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", order.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(50));
    }

    @Test
    @WithMockUser
    void sameOrderNumberDoesNotMixItemsCountsCsvOrScans() throws Exception {
        Order first = createOrder(123L);
        Order second = createOrder(999L);
        second.setOrderNumber(first.getOrderNumber());
        orders.saveAndFlush(second);
        Order empty = createOrder(555L);
        empty.setOrderNumber(first.getOrderNumber());
        orders.saveAndFlush(empty);
        createItem(123L, first.getOrderId(), "first-ok", "OK");
        createItem(123L, first.getOrderId(), "first-nok", "NOK");
        createItem(123L, second.getOrderId(), "second-rework", "REWORK");

        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", first.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalCount").value(2))
                .andExpect(jsonPath("$.okCount").value(1))
                .andExpect(jsonPath("$.nokCount").value(1))
                .andExpect(jsonPath("$.reworkCount").value(0))
                .andExpect(jsonPath("$.items[*].orderId", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(first.getOrderId().intValue()))));
        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", second.getId())
                        .param("totalResult", "NOK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.reworkCount").value(1));
        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", empty.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.totalCount").value(0));
        mvc.perform(get("/api/dashboard/order/{id}", first.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2));
        assertThat(orderService.searchItemsInOrder(second.getId(), new cz.amv.hartmann.dto.ItemFilter(),
                org.springframework.data.domain.PageRequest.of(0, 20)).getContent())
                .extracting(Item::getItemId).containsExactly("second-rework");
        String csv = mvc.perform(get("/api/dashboard/order/{id}/export.csv", second.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(csv).contains("second-rework").doesNotContain("first-ok", "first-nok");
        String emptyCsv = mvc.perform(get("/api/dashboard/order/{id}/export.csv", empty.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(emptyCsv).doesNotContain("first-ok", "first-nok", "second-rework");
        mvc.perform(get("/api/dashboard/scan/{orderId}", first.getOrderId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.item.itemId").value("first-nok"));
        mvc.perform(get("/api/dashboard/scan/{orderId}", second.getOrderId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.item.itemId").value("second-rework"));
        var stats = orderService.getDashboardStats(java.util.List.of(first, second, empty), 3);
        assertThat(stats.get("okCount")).isEqualTo(1L);
        assertThat(stats.get("nokCount")).isEqualTo(1L);
        assertThat(first.getTotalCount()).isEqualTo(2L);
        assertThat(second.getTotalCount()).isEqualTo(1L);
        assertThat(empty.getTotalCount()).isZero();
    }

    @Test
    @WithMockUser
    void filtersItemSkuAndRefInBothOrderEndpoints() throws Exception {
        Order order = createOrder(123L);
        // Order metadata deliberately differs: filters must target the item columns.
        order.setSku("order-sku");
        order.setRef("order-ref");
        orders.saveAndFlush(order);
        createItem(123L, "matched", "NOK");
        createItem(123L, "different", "NOK");
        Item different = items.findByOrderIdOrderByIdAsc(order.getOrderId()).get(1);
        ReflectionTestUtils.setField(different, "sku", "other-sku");
        ReflectionTestUtils.setField(different, "ref", "other-ref");
        items.flush();
        createItem(999L, "foreign", "NOK");
        for (String endpoint : java.util.List.of("/api/dashboard/orderDetailWithItems/" + order.getId(),
                "/api/dashboard/order/" + order.getId() + "/items")) {
            String rows = endpoint.contains("orderDetailWithItems") ? "items" : "content";
            mvc.perform(get(endpoint).param("sku", "sk").param("ref", "re").param("totalResult", "NOK")
                            .param("size", "1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(2))
                    .andExpect(jsonPath("$." + rows + ".length()").value(1));
            mvc.perform(get(endpoint).param("sku", "SKU").param("ref", "REF").param("itemId", "matched"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1))
                    .andExpect(jsonPath("$." + rows + "[0].sku").value("SKU"))
                    .andExpect(jsonPath("$." + rows + "[0].ref").value("REF"));
            for (String field : java.util.List.of("sku", "ref")) {
                mvc.perform(get(endpoint).param(field, "missing"))
                        .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
            }
        }
    }

    private Order createOrder(long number) {
        Order order = new Order();
        order.setOrderId(number + 1000);
        order.setOrderNumber(number);
        order.setSku("SKU");
        order.setRef("REF");
        order.setLineType("Linka 1");
        order.setOrderBeginDate(Instant.parse("2026-10-20T10:00:00Z"));
        return orders.saveAndFlush(order);
    }

    private void createItem(long number, String itemId, String result) {
        createItem(number, number + 1000, itemId, result);
    }

    private void createItem(long number, long orderId, String itemId, String result) {
        Item item = new Item();
        ReflectionTestUtils.setField(item, "itemId", itemId);
        ReflectionTestUtils.setField(item, "serialNumber", "=1+1");
        ReflectionTestUtils.setField(item, "endInspectionTime", Instant.parse("2026-10-20T10:00:00Z"));
        ReflectionTestUtils.setField(item, "sku", "SKU");
        ReflectionTestUtils.setField(item, "ref", "REF");
        ReflectionTestUtils.setField(item, "orderNumber", number);
        ReflectionTestUtils.setField(item, "orderId", orderId);
        ReflectionTestUtils.setField(item, "cameraNumber", (short) 1);
        ReflectionTestUtils.setField(item, "defectType", "");
        ReflectionTestUtils.setField(item, "totalResult", result);
        for (int station = 1; station <= 3; station++) {
            ReflectionTestUtils.setField(item, "station" + station + "ImagePath", "");
            ReflectionTestUtils.setField(item, "station" + station + "Result", "OK");
        }
        item.setAttentionFlag(false);
        item.setCriticalFlag(false);
        items.saveAndFlush(item);
    }
}
