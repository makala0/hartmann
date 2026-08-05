package cz.amv.hartmann.repository;

import cz.amv.hartmann.domain.AppUser;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByRoleIn(Collection<String> roles);

    List<AppUser> findByCriticalNotificationRecipientTrue();
}
