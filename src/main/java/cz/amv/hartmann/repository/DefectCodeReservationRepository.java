package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.DefectCodeReservation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DefectCodeReservationRepository extends JpaRepository<DefectCodeReservation, String> {}
