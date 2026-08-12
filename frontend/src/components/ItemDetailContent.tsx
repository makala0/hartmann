import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Checkbox, Col, Descriptions, Divider, Image, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { AlertOutlined, CameraOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { Defect, Item } from '../types';
import { getImageUrl } from '../utils/imageUtils';
import { useLanguage } from '../i18n/LanguageContext';

const { Text } = Typography;

const normalizeStation = (station: string | undefined): string => (station || '').toLowerCase().replace(/[^0-9a-z]/g, '');

const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
        const normalizedValue = value.trim().replace(',', '.');

        if (normalizedValue === '') {
            return null;
        }

        const parsedValue = Number(normalizedValue);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
};

const isPositiveFinite = (value: number) => Number.isFinite(value) && value > 0;

interface ImageSize {
    width: number;
    height: number;
}

interface DefectBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

const DEFECT_MARKER_SIZE = 44;
const DEFECT_STROKE_COLOR = '#ff1f1f';
const DEFECT_FILL_COLOR = 'rgba(255, 31, 31, 0.12)';

const getDefectBox = (defect: Defect, imageSize: ImageSize): DefectBox => {
    const rawPositionX = toFiniteNumber(defect.positionX) || 0;
    const rawPositionY = toFiniteNumber(defect.positionY) || 0;
    const rawWidth = clamp(toFiniteNumber(defect.width) || 0, 0, imageSize.width);
    const rawHeight = clamp(toFiniteNumber(defect.height) || 0, 0, imageSize.height);
    const hasReasonableBox = rawWidth <= imageSize.width * 0.15 && rawHeight <= imageSize.height * 0.15;
    const width = hasReasonableBox ? Math.max(rawWidth, DEFECT_MARKER_SIZE) : DEFECT_MARKER_SIZE;
    const height = hasReasonableBox ? Math.max(rawHeight, DEFECT_MARKER_SIZE) : DEFECT_MARKER_SIZE;
    const centerX = normalizeDefectCoordinate(rawPositionX, imageSize.width);
    const centerY = normalizeDefectCoordinate(rawPositionY, imageSize.height);

    return {
        left: clamp(centerX - (width / 2), 0, imageSize.width - width),
        top: clamp(centerY - (height / 2), 0, imageSize.height - height),
        width,
        height,
    };
};

const normalizeDefectCoordinate = (value: number, max: number): number => {
    if (Math.abs(value) <= 1) {
        return value * max;
    }

    if (Math.abs(value) <= 100) {
        return (value / 100) * max;
    }

    return clamp(value, 0, max);
};

const drawDefectBox = (context: CanvasRenderingContext2D, box: DefectBox) => {
    context.save();
    context.strokeStyle = DEFECT_STROKE_COLOR;
    context.fillStyle = DEFECT_FILL_COLOR;
    context.lineWidth = 4;
    context.fillRect(box.left, box.top, box.width, box.height);
    context.strokeRect(box.left, box.top, box.width, box.height);

    const centerX = box.left + (box.width / 2);
    const centerY = box.top + (box.height / 2);
    const crossSize = Math.min(12, box.width / 3, box.height / 3);
    context.beginPath();
    context.moveTo(centerX - crossSize, centerY);
    context.lineTo(centerX + crossSize, centerY);
    context.moveTo(centerX, centerY - crossSize);
    context.lineTo(centerX, centerY + crossSize);
    context.stroke();
    context.restore();
};

const createDefectImageUrl = (image: HTMLImageElement, defects: Defect[]): string => {
    const imageSize = { width: image.naturalWidth, height: image.naturalHeight };
    const canvas = document.createElement('canvas');
    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    const context = canvas.getContext('2d');

    if (!context) {
        return image.src;
    }

    context.drawImage(image, 0, 0, imageSize.width, imageSize.height);
    defects.forEach((defect) => drawDefectBox(context, getDefectBox(defect, imageSize)));

    return canvas.toDataURL('image/png');
};

const SafeImage: React.FC<{
    imagePath: string;
    alt: string;
    height?: number | string;
    preview?: boolean;
    defects?: Defect[];
}> = ({ imagePath, alt, height = 200, preview = true, defects = [] }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
    const imageUrl = getImageUrl(imagePath);
    const { t } = useLanguage();
    const previewDefects = useMemo(() => defects.filter((defect) => isValidDefect(defect)), [defects]);

    useEffect(() => {
        if (!imageUrl) {
            setLoading(false);
            setRenderedImageUrl(null);
            return;
        }

        let cancelled = false;
        const image = new window.Image();

        if (isCrossOriginUrl(imageUrl)) {
            image.crossOrigin = 'use-credentials';
        }

        setLoading(true);
        setError(false);
        setRenderedImageUrl(null);

        image.onload = () => {
            if (cancelled) {
                return;
            }

            const imageSize = { width: image.naturalWidth, height: image.naturalHeight };

            if (!isPositiveFinite(imageSize.width) || !isPositiveFinite(imageSize.height) || previewDefects.length === 0) {
                setRenderedImageUrl(imageUrl);
                setLoading(false);
                return;
            }

            try {
                setRenderedImageUrl(createDefectImageUrl(image, previewDefects));
            } catch (canvasError) {
                console.error('Failed to render defect overlay:', canvasError);
                setRenderedImageUrl(imageUrl);
            }

            setLoading(false);
        };

        image.onerror = () => {
            if (cancelled) {
                return;
            }

            setError(true);
            setLoading(false);
        };

        image.src = imageUrl;

        return () => {
            cancelled = true;
        };
    }, [imageUrl, previewDefects]);

    if (!imageUrl || error) {
        return (
            <div
                style={{
                    width: '100%',
                    height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    border: '1px dashed #d9d9d9',
                    borderRadius: 6,
                    color: '#999',
                }}
            >
                {t('itemDetail.imageUnavailable')}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height }}>
            {loading && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fafafa',
                        zIndex: 1,
                    }}
                >
                    <Spin />
                </div>
            )}
            <Image
                src={renderedImageUrl || imageUrl}
                alt={alt}
                width="100%"
                height={height}
                preview={preview ? { src: renderedImageUrl || imageUrl } : false}
                style={{ objectFit: 'contain', borderRadius: 6, background: '#111' }}
            />
        </div>
    );
};

const isCrossOriginUrl = (url: string): boolean => {
    try {
        return new URL(url, window.location.href).origin !== window.location.origin;
    } catch {
        return false;
    }
};

const isValidDefect = (defect: Defect) => {
    const positionX = toFiniteNumber(defect.positionX);
    const positionY = toFiniteNumber(defect.positionY);
    const width = toFiniteNumber(defect.width);
    const height = toFiniteNumber(defect.height);

    return positionX !== null
        && positionY !== null
        && width !== null
        && height !== null
        && width > 0
        && height > 0;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

interface ItemDetailContentProps {
    item: Item;
    onItemChange?: (item: Item) => void;
}

const ItemDetailContent: React.FC<ItemDetailContentProps> = ({ item, onItemChange }) => {
    const [savingFlag, setSavingFlag] = useState<'attentionFlag' | 'criticalFlag' | null>(null);
    const { t } = useLanguage();
    const defectsByStation = useMemo(() => {
        return (item.defects || []).reduce<Record<string, Defect[]>>((acc, defect) => {
            const station = normalizeStation(defect.station);
            acc[station] = [...(acc[station] || []), defect];
            return acc;
        }, {});
    }, [item.defects]);

    const getDefectsForStation = (stationNumber: number): Defect[] => {
        return Object.entries(defectsByStation)
            .filter(([station]) => station === String(stationNumber) || station.endsWith(String(stationNumber)))
            .flatMap(([, defects]) => defects);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'OK':
                return 'success';
            case 'NOK':
                return 'error';
            case 'REWORK':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'OK':
                return <CheckCircleOutlined />;
            case 'NOK':
                return <CloseCircleOutlined />;
            case 'REWORK':
                return <ToolOutlined />;
            default:
                return null;
        }
    };

    const updateFlags = async (flags: Pick<Item, 'attentionFlag' | 'criticalFlag'>, changedFlag: 'attentionFlag' | 'criticalFlag') => {
        setSavingFlag(changedFlag);
        try {
            const response = await apiClient.put<Item>(`/dashboard/item/${item.id}/flags`, flags);
            onItemChange?.(response.data);
            message.success(t('itemDetail.flagSaved'));
        } catch (error) {
            console.error('Failed to update item flags:', error);
            message.error(t('itemDetail.flagSaveFailed'));
        } finally {
            setSavingFlag(null);
        }
    };

    const flagControls = (
        <Card
            size="small"
            title={t('itemDetail.flagsTitle')}
            extra={<Text type="secondary">{t('itemDetail.flagsExtra')}</Text>}
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 12 } }}
        >
            <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                    <label
                        style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            minHeight: 72,
                            padding: '12px 14px',
                            border: `1px solid ${item.attentionFlag ? '#faad14' : '#f0f0f0'}`,
                            borderRadius: 12,
                            background: item.attentionFlag ? '#fffbe6' : '#fafafa',
                            cursor: savingFlag === null ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Checkbox
                            checked={item.attentionFlag}
                            disabled={savingFlag !== null}
                            onChange={(event) => updateFlags({
                                attentionFlag: event.target.checked,
                                criticalFlag: item.criticalFlag,
                            }, 'attentionFlag')}
                        />
                        <Space direction="vertical" size={0}>
                            <Text strong><ExclamationCircleOutlined style={{ color: '#d48806' }} /> {t('field.warning')}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{t('itemDetail.warningDescription')}</Text>
                        </Space>
                    </label>
                </Col>
                <Col xs={24} sm={12}>
                    <label
                        style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            minHeight: 72,
                            padding: '12px 14px',
                            border: `1px solid ${item.criticalFlag ? '#ff4d4f' : '#f0f0f0'}`,
                            borderRadius: 12,
                            background: item.criticalFlag ? '#fff1f0' : '#fafafa',
                            cursor: savingFlag === null ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Checkbox
                            checked={item.criticalFlag}
                            disabled={savingFlag !== null}
                            onChange={(event) => {
                                const nextCriticalFlag = event.target.checked;
                                const saveCriticalFlag = () => updateFlags({
                                    attentionFlag: item.attentionFlag,
                                    criticalFlag: nextCriticalFlag,
                                }, 'criticalFlag');

                                // if (nextCriticalFlag && !item.criticalFlag) {
                                //     Modal.confirm({
                                //         title: t('itemDetail.confirmCriticalTitle'),
                                //         content: t('itemDetail.confirmCriticalContent'),
                                //         okText: t('itemDetail.confirmCriticalOk'),
                                //         cancelText: t('common.cancel'),
                                //         okButtonProps: { danger: true },
                                //         onOk: saveCriticalFlag,
                                //     });
                                //     return;
                                // }

                                saveCriticalFlag();
                            }}
                        />
                        <Space direction="vertical" size={0}>
                            <Text strong><AlertOutlined style={{ color: '#cf1322' }} /> {t('field.critical')}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{t('itemDetail.criticalDescription')}</Text>
                        </Space>
                    </label>
                </Col>
            </Row>
        </Card>
    );

    return (
        <Row gutter={[24, 24]} align="top">
            <Col xs={24} flex="0 0 560px" style={{ maxWidth: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Descriptions title={t('itemDetail.basicInfo')} column={1} size="middle" bordered>
                        <Descriptions.Item label={t('field.itemId')}>
                            <Text code copyable={{ text: item.itemId }}>
                                {item.itemId}
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label={t('field.serialNumber')}>
                            {item.serialNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('field.orderNumber')}>
                            {item.orderNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('field.orderId')}>
                            {item.orderId}
                        </Descriptions.Item>
                        <Descriptions.Item label="SKU">
                            {item.sku}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ref">
                            {item.ref}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('field.inspectionTime')}>
                            {dayjs(item.endInspectionTime).format('DD.MM.YYYY HH:mm:ss')}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('field.camera')}>
                            <Badge count={item.cameraNumber} showZero style={{ backgroundColor: '#108ee9' }}>
                                <CameraOutlined style={{ fontSize: '18px' }} />
                            </Badge>
                        </Descriptions.Item>
                        <Descriptions.Item label={t('field.defectType')}>
                            {item.defectType === 'N/A' || !item.defectType ? (
                                <Text type="secondary">{t('items.noDefect')}</Text>
                            ) : (
                                <Tag color="orange">{item.defectType}</Tag>
                            )}
                        </Descriptions.Item>
                    </Descriptions>

                    <Card title={t('itemDetail.checkResults')} size="small">
                        <Row gutter={[16, 16]}>
                            {[
                                { num: 1, result: item.station1Result },
                                { num: 2, result: item.station2Result },
                                { num: 3, result: item.station3Result },
                            ].map(({ num, result }) => (
                                <Col span={8} key={num}>
                                    <Card size="small" style={{ textAlign: 'center' }}>
                                        <Text type="secondary">{t('itemDetail.station')} {num}</Text>
                                        <div style={{ marginTop: 8 }}>
                                            <Tag
                                                color={getStatusColor(result)}
                                                icon={getStatusIcon(result)}
                                                style={{ fontSize: '14px', padding: '4px 8px' }}
                                            >
                                                {result}
                                            </Tag>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                        <Divider />
                        <div style={{ textAlign: 'center' }}>
                            <Text strong style={{ fontSize: '16px' }}>{t('field.totalResult')}:</Text>
                            <div style={{ marginTop: 8 }}>
                                <Tag
                                    color={getStatusColor(item.totalResult)}
                                    icon={getStatusIcon(item.totalResult)}
                                    style={{ fontSize: '18px', padding: '8px 16px' }}
                                >
                                    {item.totalResult}
                                </Tag>
                            </div>
                        </div>
                    </Card>
                </Space>
            </Col>
            <Col xs={24} flex="1 1 600px" style={{ minWidth: 0 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Card title={t('itemDetail.stationImages')} size="small">
                        <Row gutter={[16, 16]}>
                            {[
                                { label: `${t('itemDetail.station')} 1`, path: item.station1ImagePath, station: 1 },
                                { label: `${t('itemDetail.station')} 2`, path: item.station2ImagePath, station: 2 },
                                { label: `${t('itemDetail.station')} 3`, path: item.station3ImagePath, station: 3 },
                            ].map(({ label, path, station }, index) => (
                                <Col xs={24} xl={8} key={index}>
                                    <Card size="small" title={label}>
                                        <SafeImage
                                            imagePath={path}
                                            alt={label}
                                            height="clamp(280px, 42vh, 560px)"
                                            preview={true}
                                            defects={getDefectsForStation(station)}
                                        />
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                    {flagControls}
                </Space>
            </Col>
        </Row>
    );
};

export default ItemDetailContent;
