package cz.amv.hartmann;

import cz.amv.hartmann.domain.Item;
import cz.amv.hartmann.domain.Order;
import cz.amv.hartmann.repository.ItemRepository;
import cz.amv.hartmann.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
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
@TestPropertySource("classpath:application-test.properties")
@AutoConfigureMockMvc
@Transactional
class OrderCsvExportTests {
    @Autowired MockMvc mvc;
    @Autowired OrderRepository orders;
    @Autowired ItemRepository items;

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(get("/api/dashboard/order/1/export.csv")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void missingOrderReturns404() throws Exception {
        mvc.perform(get("/api/dashboard/order/9223372036854775807/export.csv"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void exportsEveryItemOfOnlyTheSelectedOrderAndEscapesSpreadsheetContent() throws Exception {
        Order order = createOrder(123L);
        order.setComment("Žluťoučký; \"komentář\"\r\ndruhý řádek");
        orders.saveAndFlush(order);
        for (int i = 0; i < 25; i++) createItem(123L, "kus-" + i);
        createItem(999L, "cizí-kus");

        byte[] bytes = mvc.perform(get("/api/dashboard/order/{id}/export.csv", order.getId())
                        .param("page", "1").param("size", "1").param("totalResult", "NOK"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/csv;charset=UTF-8"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"zakazka-" + order.getId() + ".csv\""))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn().getResponse().getContentAsByteArray();
        String csv = new String(bytes, StandardCharsets.UTF_8);
        assertThat(csv).startsWith("\uFEFF\"ID zakázky\";");
        assertThat(csv).contains("\"Žluťoučký; \"\"komentář\"\"\r\ndruhý řádek\"");
        assertThat(csv).contains("\"'=1+1\"").doesNotContain("cizí-kus");
        for (int i = 0; i < 25; i++) assertThat(csv).containsOnlyOnce("\"kus-" + i + "\"");
        assertThat(csv).contains("\"2026-10-20T10:00:00Z\"");
    }

    @Test
    @WithMockUser
    void exportsOrderMetadataEvenWithoutItems() throws Exception {
        Order order = createOrder(456L);
        String csv = mvc.perform(get("/api/dashboard/order/{id}/export.csv", order.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(csv.split("\r\n")).hasSize(2);
        assertThat(csv).contains("\"456\"").doesNotContain("null");
        assertThat(csv.split("\r\n")[1].split(";", -1)).hasSize(27);
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

    private void createItem(long number, String itemId) {
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
        ReflectionTestUtils.setField(item, "totalResult", "OK");
        for (int station = 1; station <= 3; station++) {
            ReflectionTestUtils.setField(item, "station" + station + "ImagePath", "");
            ReflectionTestUtils.setField(item, "station" + station + "Result", "OK");
        }
        item.setAttentionFlag(false);
        item.setCriticalFlag(false);
        items.saveAndFlush(item);
    }
}
