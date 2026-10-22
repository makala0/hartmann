package cz.amv.hartmann;

import cz.amv.hartmann.service.ItemPriorityService;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class ItemPriorityTests {
    private final ItemPriorityService service = new ItemPriorityService();

    @Test void checksEveryCombinationOfNormalStationResults() {
        for (String s1 : new String[]{"OK", "NOK", "REWORK"})
            for (String s2 : new String[]{"OK", "NOK", "REWORK"})
                for (String s3 : new String[]{"OK", "NOK", "REWORK"}) {
                    String expected = java.util.List.of(s1, s2, s3).contains("NOK") ? "NOK"
                            : java.util.List.of(s1, s2, s3).contains("REWORK") ? "REWORK" : "OK";
                    Integer station = expected.equals("OK") ? null : expected.equals(s3) ? 3 : expected.equals(s1) ? 1 : 2;
                    var actual = service.evaluate(s1, s2, s3);
                    assertThat(actual.getStatus()).isEqualTo("COMPLETE");
                    assertThat(actual.getResult()).isEqualTo(expected);
                    assertThat(actual.getStation()).isEqualTo(station);
                }
    }

    @Test void nokAtStation2BeatsReworkAtStation3() {
        var result = service.evaluate("REWORK", "NOK", "REWORK");
        assertThat(result.getStation()).isEqualTo(2);
        assertThat(result.getCode()).isEqualTo("2.0.1");
    }

    @Test void station1BeatsStation2AtSameSeverity() {
        assertThat(service.evaluate("REWORK", "REWORK", "OK").getStation()).isEqualTo(1);
        assertThat(service.evaluate("NOK", "NOK", "OK").getStation()).isEqualTo(1);
    }

    @Test void codesCanChangeWithoutChangingPriority() {
        service.getCodes().put("ST3_REWORK", "999");
        service.setVersion("customer-v2");
        var result = service.evaluate("REWORK", "REWORK", "REWORK");
        assertThat(result.getStation()).isEqualTo(3);
        assertThat(result.getCode()).isEqualTo("999");
        assertThat(result.getLogicalKey()).isEqualTo("ST3_REWORK");
        assertThat(result.getCodeVersion()).isEqualTo("customer-v2");
    }

    @Test void missingOrTechnicalResultsAreNotOk() {
        assertThat(service.evaluate(null, "OK", "OK").getStatus()).isEqualTo("INCOMPLETE");
        assertThat(service.evaluate("OK", "ERROR", "NOK").getCode()).isNull();
        assertThat(service.evaluate("OK", "OK", "OK").getCode()).isNull();
        assertThat(service.evaluate(" ok ", " nok ", "rework").getStation()).isEqualTo(2);
    }

    @Test void configurationOverridesOneCodeAndRetainsOtherDefaults() {
        var source = new org.springframework.boot.context.properties.source.MapConfigurationPropertySource(
                java.util.Map.of("hartmann.defect-codes.version", "client-v1",
                        "hartmann.defect-codes.codes[ST3_REWORK]", "CLIENT-3"));
        new org.springframework.boot.context.properties.bind.Binder(source).bind("hartmann.defect-codes",
                org.springframework.boot.context.properties.bind.Bindable.ofInstance(service));
        assertThat(service.evaluate("OK", "OK", "REWORK").getCode()).isEqualTo("CLIENT-3");
        assertThat(service.evaluate("NOK", "OK", "OK").getCode()).isEqualTo("1.0.1");
        assertThat(service.getVersion()).isEqualTo("client-v1");
    }
}
