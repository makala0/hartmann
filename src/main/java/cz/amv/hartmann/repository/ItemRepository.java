package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long>, JpaSpecificationExecutor<Item> {

    List<Item> findByOrderNumber(Long orderNumber);


    long countByOrderNumber(Long orderNumber);

    long countByOrderNumberAndTotalResultIgnoreCase(Long orderNumber, String totalResult);

    @Query("SELECT i FROM Item i WHERE i.orderNumber IN :orderNumbers ")
    List<Item> findItemsByOrderNumbers(@Param("orderNumbers")List<Long> filteredOrderNumbers);

    List<Item> findItemsByOrderNumber(Long orderNumber);
}
