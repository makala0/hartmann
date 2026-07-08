import React, { useState } from 'react';
import { Badge, Card, Checkbox, Col, Descriptions, Divider, Image, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { CameraOutlined, CheckCircleOutlined, CloseCircleOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { Item } from '../types';
import { getImageUrl } from '../utils/imageUtils';

const { Text } = Typography;

const SafeImage: React.FC<{
    imagePath: string;
    alt: string;
    height?: number | string;
    preview?: boolean;
}> = ({ imagePath, alt, height = 200, preview = true }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const imageUrl = getImageUrl(imagePath);

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
                Obrázek není dostupný
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
                style={{ objectFit: 'cover', borderRadius: 6 }}
                onLoad={() => setLoading(false)}
                onError={() => {
                    setLoading(false);
                    setError(true);
                }}
            />
        </div>
    );
};


interface ItemDetailContentProps {
    item: Item;
    onItemChange?: (item: Item) => void;
}

const ItemDetailContent: React.FC<ItemDetailContentProps> = ({ item, onItemChange }) => {
    const [savingFlag, setSavingFlag] = useState<'attentionFlag' | 'criticalFlag' | null>(null);

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
            message.success('Označení kusu bylo uloženo');
        } catch (error) {
            console.error('Failed to update item flags:', error);
            message.error('Označení kusu se nepodařilo uložit');
        } finally {
            setSavingFlag(null);
        }
    };

    return (
        <Row gutter={[24, 24]} align="top">
            <Col xs={24} flex="0 0 560px" style={{ maxWidth: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Descriptions title="Základní informace" column={1} size="middle" bordered>
                        <Descriptions.Item label="ID Kusu">
                            <Text code copyable={{ text: item.itemId }}>
                                {item.itemId}
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Sériové číslo">
                            {item.serialNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Order Number">
                            {item.orderNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Order ID">
                            {item.orderId}
                        </Descriptions.Item>
                        <Descriptions.Item label="SKU">
                            {item.sku}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ref">
                            {item.ref}
                        </Descriptions.Item>
                        <Descriptions.Item label="Čas kontroly">
                            {dayjs(item.endInspectionTime).format('DD.MM.YYYY HH:mm:ss')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Kamera">
                            <Badge count={item.cameraNumber} showZero style={{ backgroundColor: '#108ee9' }}>
                                <CameraOutlined style={{ fontSize: '18px' }} />
                            </Badge>
                        </Descriptions.Item>
                        <Descriptions.Item label="Typ defektu">
                            {item.defectType === 'N/A' || !item.defectType ? (
                                <Text type="secondary">Bez defektu</Text>
                            ) : (
                                <Tag color="orange">{item.defectType}</Tag>
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Attention flag">
                            <Checkbox
                                checked={item.attentionFlag}
                                disabled={savingFlag !== null}
                                onChange={(event) => updateFlags({
                                    attentionFlag: event.target.checked,
                                    criticalFlag: item.criticalFlag,
                                }, 'attentionFlag')}
                            >
                                Označit attention
                            </Checkbox>
                        </Descriptions.Item>
                        <Descriptions.Item label="Critical flag">
                            <Checkbox
                                checked={item.criticalFlag}
                                disabled={savingFlag !== null}
                                onChange={(event) => updateFlags({
                                    attentionFlag: item.attentionFlag,
                                    criticalFlag: event.target.checked,
                                }, 'criticalFlag')}
                            >
                                Označit critical
                            </Checkbox>
                        </Descriptions.Item>
                    </Descriptions>

                    <Card title="Výsledky kontrol" size="small">
                        <Row gutter={[16, 16]}>
                            {[
                                { num: 1, result: item.station1Result },
                                { num: 2, result: item.station2Result },
                                { num: 3, result: item.station3Result },
                            ].map(({ num, result }) => (
                                <Col span={8} key={num}>
                                    <Card size="small" style={{ textAlign: 'center' }}>
                                        <Text type="secondary">Stanice {num}</Text>
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
                            <Text strong style={{ fontSize: '16px' }}>Celkový výsledek:</Text>
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
                <Card title="Obrázky ze stanic" size="small">
                    <Row gutter={[16, 16]}>
                        {[
                            { label: 'Stanice 1', path: item.station1ImagePath },
                            { label: 'Stanice 2', path: item.station2ImagePath },
                            { label: 'Stanice 3', path: item.station3ImagePath },
                        ].map(({ label, path }, index) => (
                            <Col xs={24} xl={8} key={index}>
                                <Card size="small" title={label}>
                                    <SafeImage
                                        imagePath={path}
                                        alt={label}
                                        height="clamp(280px, 42vh, 560px)"
                                        preview={true}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </Col>
        </Row>
    );
};

export default ItemDetailContent;
