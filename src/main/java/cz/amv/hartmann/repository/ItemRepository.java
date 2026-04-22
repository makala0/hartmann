package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.Item;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findByOrderNumber(Long orderNumber);
}
