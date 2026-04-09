package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.StationResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StationResultRepository extends JpaRepository<StationResult, Long> {
}