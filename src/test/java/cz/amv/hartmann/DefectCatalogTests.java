package cz.amv.hartmann;

import cz.amv.hartmann.domain.*;
import cz.amv.hartmann.dto.*;
import cz.amv.hartmann.repository.*;
import cz.amv.hartmann.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Transactional
@TestPropertySource("classpath:application-test.properties")
class DefectCatalogTests {
    @Autowired MockMvc mvc;
    @Autowired ItemRepository items;
    @Autowired DefectRepository defects;
    @Autowired DefectRuleRepository rules;
    @Autowired ItemClassificationRepository snapshots;
    @Autowired DefectCatalogService catalog;
    @Autowired OrderService orders;
    @Autowired OrderRepository orderRepository;
    @Autowired OrderCsvService csv;
    @Autowired ItemClassificationIndexer indexer;

    private Item item(String code, String s1, String s2, String s3) {
        Item item = new Item();
        Object[][] data = {{"itemId", code}, {"serialNumber", "serial"}, {"sku", "SKU"}, {"ref", "REF"},
                {"orderId", 100L}, {"orderNumber", 1L}, {"cameraNumber", (short) 1},
                {"defectType", "legacy"}, {"totalResult", "NOK"}, {"endInspectionTime", Instant.now()}};
        for (Object[] value : data) ReflectionTestUtils.setField(item, (String) value[0], value[1]);
        String[] statuses = {s1, s2, s3};
        for (int n = 1; n <= 3; n++) {
            ReflectionTestUtils.setField(item, "station" + n + "Result", statuses[n - 1]);
            ReflectionTestUtils.setField(item, "station" + n + "ImagePath", "station" + n + ".png");
        }
        item.setAttentionFlag(false); item.setCriticalFlag(false);
        return items.saveAndFlush(item);
    }

    private void defect(Item item, String station, String type) {
        Defect d = new Defect(); d.setItemId(item.getItemId()); d.setStation(station); d.setType(type);
        d.setPositionX(50f); d.setPositionY(50f); d.setWidth(10f); d.setHeight(10f); defects.saveAndFlush(d);
    }

    private DefectRule rule(int station, String type, Integer priority, String code) {
        DefectRuleForm form = new DefectRuleForm(); form.setStation(station); form.setCameraType(type);
        form.setPriority(priority); form.setCode(code); form.setDescriptionCs(type);
        DefectRule previous = catalog.current().get(DefectCatalogService.key(station, type));
        form.setPreviousRuleId(previous == null ? null : previous.getId());
        return catalog.save(form);
    }

    private ItemDto read(Long id) {
        return orders.searchItems(new ItemFilter(), Pageable.unpaged()).stream().filter(i -> i.getId().equals(id)).findFirst().orElseThrow();
    }

    @Test void catalogueRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/defect-catalog")).andExpect(status().isUnauthorized());
    }

    @Test @WithMockUser(roles = "WORKER") void workersCannotChangeCatalogue() throws Exception {
        mvc.perform(get("/api/defect-catalog")).andExpect(status().isForbidden());
        mvc.perform(post("/api/defect-catalog").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test @WithMockUser(roles = "ADMIN") void adminCanCreateButCannotOverwriteARevision() throws Exception {
        String json = "{\"station\":3,\"cameraType\":\"chybějící svár\",\"code\":\"3.1.1\",\"descriptionCs\":\"Chybějící svár\"}";
        mvc.perform(post("/api/defect-catalog").contentType("application/json").content(json))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.revision").value(1));
        mvc.perform(post("/api/defect-catalog").contentType("application/json").content(json))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/defect-catalog").contentType("application/json").content(json.replace("\"station\":3", "\"station\":4")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/defect-catalog/history")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    @Test void classificationsKeepHistoricalCodesWhenCatalogueChanges() {
        Item first = item("first", "REWORK", "NOK", "REWORK");
        rule(1, "Díra", null, "1.1.1");
        rule(2, "Kontaminace", null, "2.1.1");
        rule(3, "chybějící svár", null, "3.1.1");
        defect(first, "ST1", "Díra"); defect(first, "ST2", " Kontaminace "); defect(first, "ST3", "CHYBĚJÍCÍ SVÁR");
        ItemPriorityDto original = read(first.getId()).getPriority();
        assertThat(original.getCatalogStatus()).isEqualTo("CLASSIFIED");
        assertThat(original.getStation()).isEqualTo(2);
        assertThat(original.getCode()).isEqualTo("2.1.1");
        rule(2, "Kontaminace", null, "CUSTOMER-2");
        ItemPriorityDto again = read(first.getId()).getPriority();
        assertThat(again.getCode()).isEqualTo("2.1.1");
        assertThat(again.getSnapshotId()).isEqualTo(original.getSnapshotId());
        Item second = item("second", "OK", "NOK", "OK"); defect(second, "ST2", "kontaminace");
        assertThat(read(second.getId()).getPriority().getCode()).isEqualTo("CUSTOMER-2");
        assertThat(snapshots.count()).isEqualTo(2);
        assertThat(rules.count()).isEqualTo(4);
        assertThat(snapshots.findByItemRecordIdOrderByCreatedAtDesc(first.getId()).get(0).getObservationsJson()).contains("2.1.1");
        assertThat(items.findById(first.getId()).orElseThrow().getDefectType()).isEqualTo("legacy");
    }

    @Test void unresolvedStationTiesRequireExplicitPriorities() {
        Item item = item("tie", "REWORK", "REWORK", "OK");
        defect(item, "ST1", "Díra"); defect(item, "ST1", "Kontaminace"); defect(item, "ST2", "Díra");
        rule(1, "Díra", null, "A"); rule(1, "Kontaminace", null, "B");
        rule(2, "Díra", 999, "C");
        assertThat(read(item.getId()).getPriority().getCatalogStatus()).isEqualTo("AMBIGUOUS_PRIORITY");
        assertThat(snapshots.count()).isZero();
        rule(1, "Díra", 20, "A"); rule(1, "Kontaminace", 10, "B");
        assertThat(read(item.getId()).getPriority().getCode()).isEqualTo("A");
        assertThat(read(item.getId()).getPriority().getStation()).isEqualTo(1);
    }

    @Test void unknownMappingsDoNotCreateSnapshots() {
        Item item = item("unmapped", "NOK", "OK", "OK"); defect(item, "ST1", "Díra");
        assertThat(read(item.getId()).getPriority().getCatalogStatus()).isEqualTo("UNMAPPED");
        rule(1, "Díra", null, "A");
        assertThat(read(item.getId()).getPriority().getCatalogStatus()).isEqualTo("CLASSIFIED");
        assertThat(read(item.getId()).getPriority().getResult()).isEqualTo("NOK");
    }

    @Test void sameMappingUsesVisionResultForEachItem() {
        rule(2, "Díra", null, "HOLE");
        Item nok = item("vision-nok", "OK", "NOK", "OK"); defect(nok, "ST2", "Díra");
        Item rework = item("vision-rework", "OK", "REWORK", "OK"); defect(rework, "ST2", "Díra");
        assertThat(read(nok.getId()).getPriority().getResult()).isEqualTo("NOK");
        assertThat(read(rework.getId()).getPriority().getResult()).isEqualTo("REWORK");
        assertThat(read(rework.getId()).getPriority().getCode()).isEqualTo("HOLE");
        Item invalid = item("vision-ok", "OK", "OK", "OK"); defect(invalid, "ST2", "Díra");
        assertThat(read(invalid.getId()).getPriority().getCatalogStatus()).isEqualTo("INCONSISTENT");
    }

    @Test void oldCodesCannotBeReusedForAnotherMeaning() {
        rule(1, "Díra", null, "A");
        rule(1, "Díra", null, "B");
        assertThatThrownBy(() -> rule(2, "Kontaminace", null, "a"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test @WithMockUser(roles = "SERVICE") void serviceRoleCanReadCatalogue() throws Exception {
        mvc.perform(get("/api/defect-catalog")).andExpect(status().isOk());
    }

    @Test void csvExportsTheSavedCodeWithoutReinterpretingHistory() {
        Order order = new Order(); order.setOrderId(100L); order.setOrderNumber(1L); order.setSku("SKU");
        order.setRef("REF"); order.setLineType("LINE"); order.setOrderBeginDate(Instant.now());
        orderRepository.saveAndFlush(order);
        Item item = item("export", "OK", "NOK", "OK"); defect(item, "ST2", "Kontaminace");
        rule(2, "Kontaminace", null, "ORIGINAL");
        String first = new String(csv.export(order.getId()), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(first).contains("\"ORIGINAL\"", "\"CLASSIFIED\"");
        rule(2, "Kontaminace", null, "REPLACEMENT");
        String again = new String(csv.export(order.getId()), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(again).contains("\"ORIGINAL\"").doesNotContain("\"REPLACEMENT\"");
        assertThat(snapshots.count()).isEqualTo(1);
    }

    @Test void changingSourceResultsAppendsClassificationHistory() {
        Item item = item("changed", "OK", "NOK", "OK"); defect(item, "ST2", "Kontaminace");
        rule(2, "Kontaminace", null, "NOK-CODE");
        var old = read(item.getId()).getPriority();
        ReflectionTestUtils.setField(item, "station2Result", "REWORK"); items.saveAndFlush(item);
        rule(2, "Kontaminace", null, "REWORK-CODE");
        var latest = read(item.getId()).getPriority();
        assertThat(latest.getSnapshotId()).isNotEqualTo(old.getSnapshotId());
        assertThat(latest.getCode()).isEqualTo("REWORK-CODE");
        assertThat(snapshots.findByItemRecordIdOrderByCreatedAtDesc(item.getId())).hasSize(2);
    }

    @Test @WithMockUser(roles = "WORKER")
    void codeFilterClassifiesUnopenedItemsAcrossBatchesBeforeCountingAndPaging() throws Exception {
        rule(1, "Kontaminace", null, "MAIN");
        Order order = new Order(); order.setOrderId(100L); order.setOrderNumber(1L); order.setSku("SKU");
        order.setRef("REF"); order.setLineType("LINE"); order.setOrderBeginDate(Instant.now());
        orderRepository.saveAndFlush(order);
        for (int i = 0; i < 225; i++) {
            Item item = item("indexed-" + i, "NOK", "OK", "OK"); defect(item, "ST1", "Kontaminace");
        }
        Item foreign = item("foreign", "NOK", "OK", "OK");
        ReflectionTestUtils.setField(foreign, "orderId", 999L); items.saveAndFlush(foreign);
        defect(foreign, "ST1", "Kontaminace");
        Item unmapped = item("unmapped", "NOK", "OK", "OK"); defect(unmapped, "ST1", "Unknown");
        assertThat(snapshots.count()).isZero();
        mvc.perform(get("/api/dashboard/items").param("mainDefectCode", " main ").param("orderId", "100")
                        .param("page", "0").param("size", "20").param("sku", "sk"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(225))
                .andExpect(jsonPath("$.totalPages").value(12))
                .andExpect(jsonPath("$.content.length()").value(20))
                .andExpect(jsonPath("$.content[*].priority.code", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("MAIN"))));
        assertThat(snapshots.count()).isEqualTo(226);
        mvc.perform(get("/api/dashboard/items").param("mainDefectCode", "MAIN").param("orderId", "100")
                        .param("page", "11").param("size", "20"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(5));
        mvc.perform(get("/api/dashboard/orderDetailWithItems/{id}", order.getId())
                        .param("mainDefectCode", "MAIN").param("page", "11").param("size", "20"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(225))
                .andExpect(jsonPath("$.items.length()").value(5));
        mvc.perform(get("/api/dashboard/order/{id}/items", order.getId()).param("mainDefectCode", "MISSING"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test void scheduledBatchesDiscoverNewRecordsAndNewMappingsWithoutOpeningItems() {
        Item first = item("automatic-1", "OK", "NOK", "OK"); defect(first, "ST2", "Kontaminace");
        new ItemClassificationJob(indexer).run();
        assertThat(snapshots.count()).isZero();
        rule(2, "Kontaminace", null, "FIRST");
        new ItemClassificationJob(indexer).run();
        assertThat(snapshots.findByItemRecordIdOrderByCreatedAtDesc(first.getId())).hasSize(1);
        rule(2, "Kontaminace", null, "SECOND");
        Item next = item("automatic-2", "OK", "NOK", "OK"); defect(next, "ST2", "Kontaminace");
        new ItemClassificationJob(indexer).run();
        assertThat(snapshots.findByItemRecordIdOrderByCreatedAtDesc(next.getId()).get(0).getCode()).isEqualTo("SECOND");
        assertThat(snapshots.findByItemRecordIdOrderByCreatedAtDesc(first.getId()).get(0).getCode()).isEqualTo("FIRST");
        assertThat(snapshots.count()).isEqualTo(2);
    }
}
