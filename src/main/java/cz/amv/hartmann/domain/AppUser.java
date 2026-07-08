package cz.amv.hartmann.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "app_users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role = "ROLE_USER";

    @Column(name = "critical_notifications_enabled")
    private Boolean criticalNotificationsEnabled = false;

    @ElementCollection
    @CollectionTable(
            name = "app_user_critical_notification_emails",
            joinColumns = @JoinColumn(name = "user_id")
    )
    @Column(name = "email")
    private List<String> criticalNotificationEmails = new ArrayList<>();
}
