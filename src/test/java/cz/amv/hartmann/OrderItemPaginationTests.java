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
        Item item = new Item();
        ReflectionTestUtils.setField(item, "itemId", itemId);
        ReflectionTestUtils.setField(item, "serialNumber", "=1+1");
        ReflectionTestUtils.setField(item, "endInspectionTime", Instant.parse("2026-10-20T10:00:00Z"));
        ReflectionTestUtils.setField(item, "sku", "SKU");
        ReflectionTestUtils.setField(item, "ref", "REF");
        ReflectionTestUtils.setField(item, "orderNumber", number);
        ReflectionTestUtils.setField(item, "orderId", number + 1000);
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
