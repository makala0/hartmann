package cz.amv.hartmann.service;

import cz.amv.hartmann.domain.*;
import cz.amv.hartmann.dto.*;
import cz.amv.hartmann.repository.DefectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class ItemInspectionMapper {
    private final DefectRepository defectRepository;
    private final ItemPriorityService itemPriorityService;
    private final ItemClassificationService itemClassificationService;

    public ItemDto convertToDto(Item item) {
        ItemDto dto = new ItemDto();
        dto.setPriority(itemPriorityService.evaluate(item.getStation1Result(), item.getStation2Result(), item.getStation3Result()));
        dto.setComment(item.getComment());
        dto.setId(item.getId());
        dto.setItemId(item.getItemId());
        dto.setSerialNumber(item.getSerialNumber());
        dto.setEndInspectionTime(item.getEndInspectionTime());
        dto.setSku(item.getSku());
        dto.setRef(item.getRef());
        dto.setOrderNumber(item.getOrderNumber());
        dto.setOrderId(item.getOrderId());
        dto.setCameraNumber(item.getCameraNumber());
        dto.setDefectType(item.getDefectType());
        dto.setTotalResult(item.getTotalResult());
        dto.setStation1Result(item.getStation1Result());
        dto.setStation2Result(item.getStation2Result());
        dto.setStation3Result(item.getStation3Result());
        dto.setStation1ImagePath(item.getStation1ImagePath());
        dto.setStation2ImagePath(item.getStation2ImagePath());
        dto.setStation3ImagePath(item.getStation3ImagePath());
        dto.setAttentionFlag(item.getAttentionFlag());
        dto.setCriticalFlag(item.getCriticalFlag());
        dto.setCriticalNotificationSent(item.getCriticalNotificationSent());
        dto.setWarningNotificationSent(item.getWarningNotificationSent());
        dto.setDefects(List.of());
        return dto;
    }

    public ItemDto convertToDtoWithDefects(Item item) {
        ItemDto dto = convertToDto(item);
        dto.setDefects(defectRepository.findByItemIdIn(List.of(item.getItemId())).stream()
                .map(this::convertToDto)
                .toList());
        itemClassificationService.enrich(List.of(dto));
        return dto;
    }

    public List<ItemDto> convertToDtos(List<Item> items) {
        List<ItemDto> itemDtos = items.stream().map(this::convertToDto).collect(Collectors.toList());
        List<String> itemIds = items.stream().map(Item::getItemId).toList();
        Map<String, List<DefectDto>> defectsByItemId = itemIds.isEmpty()
                ? Map.of()
                : defectRepository.findByItemIdIn(itemIds).stream()
                .map(this::convertToDto)
                .collect(Collectors.groupingBy(DefectDto::getItemId));

        itemDtos.forEach(itemDto -> itemDto.setDefects(
                defectsByItemId.getOrDefault(itemDto.getItemId(), List.of())
        ));

        itemClassificationService.enrich(itemDtos);
        return itemDtos;
    }

    private DefectDto convertToDto(Defect defect) {
        DefectDto dto = new DefectDto();
        dto.setId(defect.getId());
        dto.setItemId(defect.getItemId());
        dto.setPositionX(defect.getPositionX());
        dto.setPositionY(defect.getPositionY());
        dto.setWidth(defect.getWidth());
        dto.setHeight(defect.getHeight());
        dto.setStation(defect.getStation());
        dto.setType(defect.getType());
        return dto;
    }
}
