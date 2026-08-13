package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.AppUser;
import cz.amv.hartmann.domain.Item;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${smtp.email:${MAIL_SENDER}}")
    private String mailSenderString;
    private static final Logger LOGGER = LoggerFactory.getLogger(CriticalItemNotificationService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AppUserService appUserService;

    public boolean notifyCriticalFlagEnabled(Item item, AppUser user) {
        return sendItemNotification(
                item,
                "Kritický kus označen: " + item.getItemId(),
                "Uživatel " + user.getEmail() + " označil kus jako kritický."
        );
    }

    public boolean notifyWarningFlagEnabled(Item item) {
        return sendItemNotification(
                item,
                "Varovný kus označen: " + item.getItemId(),
                "Kus byl označen jako varovný a je zařazený do půlnočního souhrnu."
        );
    }

    private boolean sendItemNotification(Item item, String subject, String intro) {
        List<String> recipients = appUserService.findCriticalNotificationRecipientEmails();
        if (recipients == null || recipients.isEmpty()) {
            return true;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            LOGGER.warn("Critical item notification was skipped because JavaMailSender is not configured.");
            return false;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailSenderString);
        message.setTo(recipients.toArray(String[]::new));
        message.setSubject(subject);
        message.setText(buildMessage(item, intro));

        try {
            mailSender.send(message);
            return true;
        } catch (MailException ex) {
            LOGGER.error("Item notification email could not be sent for item {}.", item.getId(), ex);
            return false;
        }
    }

    private String buildMessage(Item item, String intro) {
        return intro + "\n\n"
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
