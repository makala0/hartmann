package cz.amv.hartmann.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor
@ConditionalOnProperty(name = "hartmann.classification.enabled", havingValue = "true", matchIfMissing = true)
public class ItemClassificationJob {
    private static final Logger LOG = LoggerFactory.getLogger(ItemClassificationJob.class);
    private final ItemClassificationIndexer indexer;

    @Scheduled(fixedDelayString = "${hartmann.classification.delay-ms:5000}",
            initialDelayString = "${hartmann.classification.initial-delay-ms:30000}")
    public void run() {
        try { indexer.nextBatch(); }
        catch (RuntimeException failure) { LOG.error("Classification batch failed; it will be retried without advancing the cursor", failure); }
    }
}
