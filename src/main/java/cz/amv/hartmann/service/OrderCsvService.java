package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.Item;
import cz.amv.hartmann.domain.Order;
import cz.amv.hartmann.repository.ItemRepository;
import cz.amv.hartmann.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderCsvService {
    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;

    @Transactional(readOnly = true)
    public byte[] export(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Zakázka nenalezena"));
        // Match the order-detail association; do not apply table filters or pagination.
        List<Item> items = itemRepository.findByOrderNumberOrderByIdAsc(order.getOrderNumber());
        StringBuilder csv = new StringBuilder("\uFEFF");
        row(csv, "ID zakázky", "Číslo zakázky", "SKU zakázky", "Ref zakázky", "Typ linky",
                "Receptura", "Zahájení zakázky (UTC)", "Komentář zakázky", "Item ID", "Sériové číslo",
                "Čas kontroly (UTC)", "SKU kusu", "Ref kusu", "Kamera", "Typ vady", "Celkový výsledek",
                "Výsledek stanice 1", "Výsledek stanice 2", "Výsledek stanice 3", "Varování", "Kritická");
        if (items.isEmpty()) {
            appendItem(csv, order, null);
        } else {
            items.forEach(item -> appendItem(csv, order, item));
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendItem(StringBuilder csv, Order order, Item item) {
        row(csv, order.getOrderId(), order.getOrderNumber(), order.getSku(), order.getRef(),
                order.getLineType(), order.getRecipe(), order.getOrderBeginDate(), order.getComment(),
                item == null ? null : item.getItemId(), item == null ? null : item.getSerialNumber(),
                item == null ? null : item.getEndInspectionTime(), item == null ? null : item.getSku(),
                item == null ? null : item.getRef(), item == null ? null : item.getCameraNumber(),
                item == null ? null : item.getDefectType(), item == null ? null : item.getTotalResult(),
                item == null ? null : item.getStation1Result(), item == null ? null : item.getStation2Result(),
                item == null ? null : item.getStation3Result(),
                item == null ? null : Boolean.TRUE.equals(item.getAttentionFlag()) ? "Ano" : "Ne",
                item == null ? null : Boolean.TRUE.equals(item.getCriticalFlag()) ? "Ano" : "Ne");
    }

    private void row(StringBuilder csv, Object... values) {
        csv.append(Arrays.stream(values).map(this::cell).collect(Collectors.joining(";"))).append("\r\n");
    }

    private String cell(Object value) {
        String text = value == null ? "" : value.toString();
        // Quoting alone does not stop spreadsheets from interpreting formulas.
        String stripped = text.stripLeading();
        if (!stripped.isEmpty() && "=+-@".indexOf(stripped.charAt(0)) >= 0
                || text.startsWith("\t") || text.startsWith("\r") || text.startsWith("\n")) {
            text = "'" + text;
        }
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }
}
