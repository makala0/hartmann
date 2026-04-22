package cz.amv.hartmann.dto;

import cz.amv.hartmann.domain.Item;
import cz.amv.hartmann.domain.Order;
import lombok.Data;

import java.util.List;

@Data
public class OrderDetailDto {
    private Order order;
    private List<Item> items;
    private Integer totalItems;
    private Integer okItems;
    private Integer nokItems;
    private Integer reworkItems;
}
