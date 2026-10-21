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
class ItemCommentTests {
    @Autowired MockMvc mvc;
    @Autowired OrderRepository orders;
    @Autowired ItemRepository items;
    @Autowired jakarta.persistence.EntityManager entityManager;

    @Test
    void commentRequiresAuthentication() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/dashboard/item/1/comment")
                        .contentType("application/json").content("{\"comment\":\"test\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void persistsUpdatesAndClearsOnlyTheSelectedItemComment() throws Exception {
        Order order = createOrder(123L);
        order.setComment("Komentář zakázky");
        orders.saveAndFlush(order);
        createItem(123L, "first", "NOK");
        createItem(123L, "second", "OK");
        var selected = items.findByOrderIdOrderByIdAsc(order.getOrderId()).get(0);
        Long id = selected.getId();
        Long orderId = order.getId();
        save(id, "{\"comment\":\"Žluťoučký komentář\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comment").value("Žluťoučký komentář"))
                .andExpect(jsonPath("$.itemId").value("first"))
                .andExpect(jsonPath("$.totalResult").value("NOK"));
        entityManager.flush();
        entityManager.clear();
        assertThat(items.findById(id).orElseThrow().getComment()).isEqualTo("Žluťoučký komentář");
        assertThat(items.findByOrderIdOrderByIdAsc(1123L).get(1).getComment()).isNull();
        assertThat(orders.findById(orderId).orElseThrow().getComment()).isEqualTo("Komentář zakázky");
        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.itemId == 'first')].comment", org.hamcrest.Matchers.contains("Žluťoučký komentář")));
        save(id, "{\"comment\":\"Upravený komentář\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.comment").value("Upravený komentář"));
        save(id, "{\"comment\":\"\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.comment").value(""));
        save(id, "{\"comment\":null}").andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void rejectsTooLongCommentsAndMissingItems() throws Exception {
        createItem(123L, "first", "OK");
        Long id = items.findByOrderIdOrderByIdAsc(1123L).get(0).getId();
        save(id, "{\"comment\":\"" + "x".repeat(4000) + "\"}").andExpect(status().isOk());
        save(id, "{\"comment\":\"" + "x".repeat(4001) + "\"}").andExpect(status().isBadRequest());
        assertThat(items.findById(id).orElseThrow().getComment()).hasSize(4000);
        save(Long.MAX_VALUE, "{\"comment\":\"test\"}").andExpect(status().isNotFound());
    }

    private org.springframework.test.web.servlet.ResultActions save(Long id, String json) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                "/api/dashboard/item/{id}/comment", id).contentType("application/json")
                .characterEncoding("UTF-8").content(json));
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
