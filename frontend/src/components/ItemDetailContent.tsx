import React, { useMemo, useState } from 'react';
import { Badge, Card, Checkbox, Col, Descriptions, Divider, Image, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { AlertOutlined, CameraOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { Defect, Item } from '../types';
import { getImageUrl } from '../utils/imageUtils';
import { useLanguage } from '../i18n/LanguageContext';

const { Text } = Typography;

const normalizeStation = (station: string | undefined): string => (station || '').toLowerCase().replace(/[^0-9a-z]/g, '');

const getDefectStyle = (defect: Defect, naturalSize: { width: number; height: number } | null): React.CSSProperties | null => {
    if (!naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
        return null;
    }

    return {
        left: `${(defect.positionX / naturalSize.width) * 100}%`,
        top: `${(defect.positionY / naturalSize.height) * 100}%`,
        width: `${(defect.width / naturalSize.width) * 100}%`,
        height: `${(defect.height / naturalSize.height) * 100}%`,
    };
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
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
    const imageUrl = getImageUrl(imagePath);
    const { t } = useLanguage();

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
                src={imageUrl}
                alt={alt}
                width="100%"
                height={height}
                preview={preview}
                style={{ objectFit: 'fill', borderRadius: 6 }}
                onLoad={(event) => {
                    setLoading(false);
                    setNaturalSize({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight,
                    });
                }}
                onError={() => {
                    setLoading(false);
                    setError(true);
                }}
            />
            {!loading && defects.map((defect) => {
                const defectStyle = getDefectStyle(defect, naturalSize);

                if (!defectStyle) {
                    return null;
                }

                return (
                    <div
                        key={defect.id}
                        title={defect.type}
                        style={{
                            position: 'absolute',
                            boxSizing: 'border-box',
                            border: '3px solid #ff1f1f',
                            backgroundColor: 'rgba(255, 31, 31, 0.16)',
                            pointerEvents: 'none',
                            zIndex: 2,
                            ...defectStyle,
                        }}
                    />
                );
            })}
        </div>
    );
};


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
        const stationAliases = [String(stationNumber), `station${stationNumber}`, `s${stationNumber}`];
        return stationAliases.flatMap((station) => defectsByStation[station] || []);
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
                                { num: 1, label: `${t('itemDetail.station')} 1`, path: item.station1ImagePath },
                                { num: 2, label: `${t('itemDetail.station')} 2`, path: item.station2ImagePath },
                                { num: 3, label: `${t('itemDetail.station')} 3`, path: item.station3ImagePath },
                            ].map(({ num, label, path }, index) => (
                                <Col xs={24} xl={8} key={index}>
                                    <Card size="small" title={label}>
                                        <SafeImage
                                            imagePath={path}
                                            alt={label}
                                            height="clamp(280px, 42vh, 560px)"
                                            preview={true}
                                            defects={getDefectsForStation(num)}
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
