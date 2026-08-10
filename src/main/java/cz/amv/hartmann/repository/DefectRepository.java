package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.Defect;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface DefectRepository extends JpaRepository<Defect, Long> {
    List<Defect> findByItemIdIn(Collection<String> itemIds);
}
