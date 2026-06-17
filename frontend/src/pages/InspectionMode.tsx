import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Badge,
    Card,
    Col,
    Descriptions,
    Image,
    Row,
    Spin,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    BarcodeOutlined,
    CameraOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { Item } from '../types';
import { getImageUrl } from '../utils/imageUtils';

const { Title, Text } = Typography;

const SCAN_IDLE_DELAY_MS = 250;

const InspectionMode: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const scanBufferRef = useRef('');
    const scanTimeoutRef = useRef<number | null>(null);
    const loadingRef = useRef(false);

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

    const clearScanTimeout = () => {
        if (scanTimeoutRef.current) {
            window.clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
        }
    };

    const submitScan = useCallback(async (code: string) => {
        const normalizedCode = code.trim();
        scanBufferRef.current = '';
        clearScanTimeout();

        if (!normalizedCode || loadingRef.current) {
            return;
        }

        if (!/^\d+$/.test(normalizedCode)) {
            message.error(`Neplatný kód: ${normalizedCode}`);
            return;
        }

        loadingRef.current = true;
        setLoading(true);

        try {
            const response = await apiClient.get<{ orderId: number; item: Item }>(`/dashboard/scan/${normalizedCode}`);
            setSelectedItem(response.data.item);
            message.success(`Načten kus ${response.data.item.itemId}`);
        } catch (error) {
            console.error('Failed to load scanned item:', error);
            message.error(`Kód ${normalizedCode} nebyl nalezen`);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const scheduleAutomaticSubmit = () => {
            clearScanTimeout();
            scanTimeoutRef.current = window.setTimeout(() => {
                submitScan(scanBufferRef.current);
            }, SCAN_IDLE_DELAY_MS);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                submitScan(scanBufferRef.current);
                return;
            }

            if (event.key === 'Backspace') {
                scanBufferRef.current = scanBufferRef.current.slice(0, -1);
                scheduleAutomaticSubmit();
                return;
            }

            if (event.key.length === 1) {
                scanBufferRef.current += event.key;
                scheduleAutomaticSubmit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearScanTimeout();
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [submitScan]);

    return (
        <div style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto' }}>
            {selectedItem ? (
                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={8}>
                        <Card title={`Detail kusu ${selectedItem.itemId}`}>
                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="ID Kusu">
                                    <Text code copyable={{ text: selectedItem.itemId }}>{selectedItem.itemId}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Sériové číslo">{selectedItem.serialNumber}</Descriptions.Item>
                                <Descriptions.Item label="Order Number">{selectedItem.orderNumber}</Descriptions.Item>
                                <Descriptions.Item label="Order ID">{selectedItem.orderId}</Descriptions.Item>
                                <Descriptions.Item label="Čas kontroly">
                                    {dayjs(selectedItem.endInspectionTime).format('DD.MM.YYYY HH:mm:ss')}
                                </Descriptions.Item>
                                <Descriptions.Item label="Kamera">
                                    <Badge count={selectedItem.cameraNumber} showZero style={{ backgroundColor: '#108ee9' }}>
                                        <CameraOutlined />
                                    </Badge>
                                </Descriptions.Item>
                                <Descriptions.Item label="Celkový výsledek">
                                    <Tag color={getStatusColor(selectedItem.totalResult)} icon={getStatusIcon(selectedItem.totalResult)}>
                                        {selectedItem.totalResult}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Defekt">
                                    {selectedItem.defectType && selectedItem.defectType !== 'N/A' ? selectedItem.defectType : 'Bez defektu'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </Col>
                    <Col xs={24} lg={16}>
                        <Card title="Obrázky ze stanic">
                            <Row gutter={[16, 16]}>
                                {[
                                    { label: 'Stanice 1', path: selectedItem.station1ImagePath, result: selectedItem.station1Result },
                                    { label: 'Stanice 2', path: selectedItem.station2ImagePath, result: selectedItem.station2Result },
                                    { label: 'Stanice 3', path: selectedItem.station3ImagePath, result: selectedItem.station3Result },
                                ].map(({ label, path, result }) => (
                                    <Col xs={24} xl={8} key={label}>
                                        <Card
                                            size="small"
                                            title={label}
                                            extra={<Tag color={getStatusColor(result)} icon={getStatusIcon(result)}>{result}</Tag>}
                                        >
                                            <Image
                                                src={getImageUrl(path) || undefined}
                                                alt={label}
                                                width="100%"
                                                height={360}
                                                style={{ objectFit: 'cover', borderRadius: 6 }}
                                            />
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Card style={{ textAlign: 'center', padding: '110px 48px' }}>
                    <BarcodeOutlined style={{ fontSize: 64, color: '#1677ff' }} />
                    <Title level={3}>Čekám na první kód</Title>
                    <Text type="secondary">Po načtení kódu se zde zobrazí detail kusu.</Text>
                    {loading && <div style={{ marginTop: 24 }}><Spin /></div>}
                </Card>
            )}
        </div>
    );
};

export default InspectionMode;
