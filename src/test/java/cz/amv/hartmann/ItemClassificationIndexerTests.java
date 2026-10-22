package cz.amv.hartmann;

import cz.amv.hartmann.domain.DefectRule;
import cz.amv.hartmann.domain.Item;
import cz.amv.hartmann.repository.DefectRuleRepository;
import cz.amv.hartmann.repository.ItemRepository;
import cz.amv.hartmann.service.ItemClassificationIndexer;
import cz.amv.hartmann.service.ItemInspectionMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ItemClassificationIndexerTests {
    private Item item(long id) {
        Item item = new Item(); ReflectionTestUtils.setField(item, "id", id); return item;
    }
    private DefectRule revision(long id) {
        DefectRule rule = new DefectRule(); rule.setId(id); return rule;
    }

    @Test void failedBatchDoesNotAdvanceTheCursor() {
        var items = mock(ItemRepository.class);
        var rules = mock(DefectRuleRepository.class);
        var mapper = mock(ItemInspectionMapper.class);
        var row = item(3);
        when(rules.findTopByOrderByIdDesc()).thenReturn(Optional.of(revision(1)));
        when(items.findTopByOrderByIdDesc()).thenReturn(Optional.of(row));
        when(items.findByIdGreaterThanAndIdLessThanEqualOrderByIdAsc(eq(0L), eq(3L), any())).thenReturn(List.of(row));
        when(mapper.convertToDtos(List.of(row))).thenThrow(new IllegalStateException("retry")).thenReturn(List.of());
        var indexer = new ItemClassificationIndexer(items, rules, mapper);
        assertThatThrownBy(indexer::nextBatch).isInstanceOf(IllegalStateException.class);
        indexer.nextBatch();
        verify(items, times(2)).findByIdGreaterThanAndIdLessThanEqualOrderByIdAsc(eq(0L), eq(3L), any());
    }

    @Test void catchUpUsesAFixedHighWaterMarkAndNextBatchFindsLaterArrivals() {
        var items = mock(ItemRepository.class);
        var rules = mock(DefectRuleRepository.class);
        var mapper = mock(ItemInspectionMapper.class);
        when(rules.findTopByOrderByIdDesc()).thenReturn(Optional.of(revision(1)));
        when(items.findTopByOrderByIdDesc()).thenReturn(Optional.of(item(10)), Optional.of(item(11)));
        when(items.findByIdGreaterThanAndIdLessThanEqualOrderByIdAsc(eq(0L), eq(10L), any())).thenReturn(List.of(item(5)));
        when(items.findByIdGreaterThanAndIdLessThanEqualOrderByIdAsc(eq(5L), eq(10L), any())).thenReturn(List.of(item(10)));
        var indexer = new ItemClassificationIndexer(items, rules, mapper);
        indexer.catchUp();
        verify(items, times(1)).findTopByOrderByIdDesc();
        indexer.nextBatch();
        verify(items).findByIdGreaterThanAndIdLessThanEqualOrderByIdAsc(eq(10L), eq(11L), any());
    }

    @Test void aNewCatalogueRevisionRevisitsPreviouslyUnmappedRows() {
        var items = mock(ItemRepository.class);
        var rules = mock(DefectRuleRepository.class);
        var mapper = mock(ItemInspectionMapper.class);
        when(rules.findTopByOrderByIdDesc()).thenReturn(Optional.of(revision(1)), Optional.of(revision(2)));
        when(items.findTopByOrderByIdDesc()).thenReturn(Optional.of(item(1)));
        when(items.findByIdGreaterThanAndIdLessThanEqualOrderByIdAsc(eq(0L), eq(1L), any())).thenReturn(List.of(item(1)));
        var indexer = new ItemClassificationIndexer(items, rules, mapper);
        indexer.nextBatch(); indexer.nextBatch();
        verify(items, times(2)).findByIdGreaterThanAndIdLessThanEqualOrderByIdAsc(eq(0L), eq(1L), any());
    }
}
