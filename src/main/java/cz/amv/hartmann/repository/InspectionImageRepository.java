package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.InspectionImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InspectionImageRepository extends JpaRepository<InspectionImage, Long> {
}