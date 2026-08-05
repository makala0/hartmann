package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.AppUser;
import cz.amv.hartmann.domain.Item;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CriticalItemNotificationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CriticalItemNotificationService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AppUserService appUserService;

    public void notifyCriticalFlagEnabled(Item item, AppUser user) {
        List<String> recipients = appUserService.findCriticalNotificationRecipientEmails();
        if (recipients == null || recipients.isEmpty()) {
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            LOGGER.warn("Critical item notification was skipped because JavaMailSender is not configured.");
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("jaroslav.macala@amvtechnology.cz");
        message.setTo(recipients.toArray(String[]::new));
        message.setSubject("Kritický kus označen: " + item.getItemId());
        message.setText(buildMessage(item, user));

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            LOGGER.error("Critical item notification email could not be sent for item {}.", item.getId(), ex);
        }
    }

    private String buildMessage(Item item, AppUser user) {
        return "Uživatel " + user.getEmail() + " označil kus jako kritický.\n\n"
                + "ID kusu: " + item.getItemId() + "\n"
                + "Sériové číslo: " + item.getSerialNumber() + "\n"
                + "Zakázka: " + item.getOrderNumber() + "\n"
                + "Order ID: " + item.getOrderId() + "\n"
                + "SKU: " + item.getSku() + "\n"
                + "REF: " + item.getRef() + "\n"
                + "Kamera: " + item.getCameraNumber() + "\n"
                + "Výsledek: " + item.getTotalResult() + "\n"
                + "Typ defektu: " + item.getDefectType() + "\n"
                + "Čas kontroly: " + DATE_FORMATTER.format(item.getEndInspectionTime()) + "\n";
    }
}
