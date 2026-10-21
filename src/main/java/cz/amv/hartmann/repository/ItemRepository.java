package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long>, JpaSpecificationExecutor<Item> {

    List<Item> findByOrderId(Long orderId);

    List<Item> findByOrderIdOrderByIdAsc(Long orderId);

    Optional<Item> findFirstByOrderIdOrderByEndInspectionTimeDescIdDesc(Long orderId);

    long countByOrderId(Long orderId);

    long countByOrderIdAndTotalResultIgnoreCase(Long orderId, String totalResult);

    List<Item> findByCriticalFlagTrueAndCriticalNotificationSentFalse();

    List<Item> findByAttentionFlagTrueAndWarningNotificationSentFalse();

    @Query("""
            SELECT i.orderId AS orderId,
                   SUM(CASE WHEN UPPER(i.totalResult) = 'OK' THEN 1L ELSE 0L END) AS okCount,
                   SUM(CASE WHEN UPPER(i.totalResult) = 'NOK' THEN 1L ELSE 0L END) AS nokCount,
                   SUM(CASE WHEN UPPER(i.totalResult) = 'REWORK' THEN 1L ELSE 0L END) AS reworkCount,
                   COUNT(i) AS totalCount
            FROM Item i
            WHERE i.orderId IN :orderIds
            GROUP BY i.orderId
            """)
    List<ItemResultStats> getResultStatsByOrderIds(@Param("orderIds") List<Long> orderIds);

    interface ItemResultStats {
        Long getOrderId();
        Long getOkCount();
        Long getNokCount();
        Long getReworkCount();
        Long getTotalCount();
    }
}
