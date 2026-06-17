package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long>, JpaSpecificationExecutor<Item> {

    List<Item> findByOrderNumber(Long orderNumber);

    Optional<Item> findFirstByOrderNumberOrderByEndInspectionTimeDesc(Long orderNumber);

    long countByOrderNumber(Long orderNumber);

    long countByOrderNumberAndTotalResultIgnoreCase(Long orderNumber, String totalResult);

    @Query("""
            SELECT i.orderNumber AS orderNumber,
                   SUM(CASE WHEN UPPER(i.totalResult) = 'OK' THEN 1L ELSE 0L END) AS okCount,
                   SUM(CASE WHEN UPPER(i.totalResult) = 'NOK' THEN 1L ELSE 0L END) AS nokCount,
                   SUM(CASE WHEN UPPER(i.totalResult) = 'REWORK' THEN 1L ELSE 0L END) AS reworkCount,
                   COUNT(i) AS totalCount
            FROM Item i
            WHERE i.orderNumber IN :orderNumbers
            GROUP BY i.orderNumber
            """)
    List<ItemResultStats> getResultStatsByOrderNumbers(@Param("orderNumbers") List<Long> orderNumbers);

    interface ItemResultStats {
        Long getOrderNumber();
        Long getOkCount();
        Long getNokCount();
        Long getReworkCount();
        Long getTotalCount();
    }
}
