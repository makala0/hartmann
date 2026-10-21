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
class ItemListFilterTests {
    @Autowired MockMvc mvc;
    @Autowired OrderRepository orders;
    @Autowired ItemRepository items;

    @Test
    @WithMockUser
    void combinesAllFiltersBeforePagingAndSupportsEachNewFilter() throws Exception {
        for (int i = 0; i < 50; i++) createItem(123L, "kus-" + i, i % 2 == 0 ? "NOK" : "OK");
        for (Item item : items.findByOrderId(1123L)) {
            ReflectionTestUtils.setField(item, "defectType", "Scratch");
            item.setAttentionFlag(true);
            item.setCriticalFlag(true);
        }
        items.flush();
        createItem(999L, "kus-other-order", "NOK");
        var params = new org.springframework.util.LinkedMultiValueMap<String, String>();
        params.add("orderId", "1123");
        params.add("totalResult", "nok");
        params.add("sku", "sk");
        params.add("ref", "re");
        params.add("cameraNumber", "1");
        params.add("itemId", "KUS-");
        params.add("serialNumber", "=1+");
        params.add("defectType", "scratch");
        params.add("attentionFlag", "true");
        params.add("criticalFlag", "true");
        params.add("size", "20");
        mvc.perform(get("/api/dashboard/items").params(params))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(20))
                .andExpect(jsonPath("$.content[0].itemId").value("kus-48"))
                .andExpect(jsonPath("$.content[19].itemId").value("kus-10"));
        params.set("page", "1");
        mvc.perform(get("/api/dashboard/items").params(params))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.content.length()").value(5))
                .andExpect(jsonPath("$.content[0].itemId").value("kus-8"));
        params.set("page", "0");
        for (String field : java.util.List.of("totalResult", "cameraNumber", "itemId", "serialNumber", "defectType", "sku", "ref")) {
            String value = params.getFirst(field);
            params.set(field, field.equals("cameraNumber") ? "2" : "missing");
            mvc.perform(get("/api/dashboard/items").params(params))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0));
            params.set(field, value);
        }
        mvc.perform(get("/api/dashboard/items"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(51));
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
