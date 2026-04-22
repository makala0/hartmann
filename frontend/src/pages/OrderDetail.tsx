import React, { useEffect, useState } from 'react';
import {
    Card,
    Table,
    Statistic,
    Row,
    Col,
    Button,
    Space,
    Tag,
    Image,
    Typography,
    Descriptions,
    Divider,
    Progress,
    Tooltip,
    Badge,
    Select,
    Input,
    Drawer,
    Spin,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ArrowLeftOutlined,
    ToolOutlined,
    EyeOutlined,
    ReloadOutlined,
    FilterOutlined,
    SettingOutlined,
    CameraOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { OrderDetailWithItems, Item } from '../types';
import { getImageUrl } from '../utils/imageUtils';

const { Title, Text } = Typography;
const { Option } = Select;

// Komponenta pro zobrazení obrázku s error handlingem
const SafeImage: React.FC<{
    imagePath: string;
    alt: string;
    width?: number | string;
    height?: number | string;
    style?: React.CSSProperties;
    preview?: boolean;
}> = ({ imagePath, alt, width = "100%", height = 200, style, preview = true }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const imageUrl = getImageUrl(imagePath);

    const handleLoad = () => {
        setLoading(false);
        setError(false);
    };

    const handleError = () => {
        setLoading(false);
        setError(true);
    };

    if (!imageUrl || error) {
        return (
            <div
                style={{
                    width,
                    height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #d9d9d9',
                    borderRadius: '6px',
                    backgroundColor: '#fafafa',
                    ...style
                }}
            >
                <div style={{ textAlign: 'center', color: '#999' }}>
                    <ExclamationCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                    <div>Obrázek nedostupný</div>
                    {imagePath && (
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            {imagePath.split('/').pop()}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width, height, ...style }}>
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f0f0',
                    zIndex: 1
                }}>
                    <Spin size="large" />
                </div>
            )}
            {preview ? (
                <Image
                    src={imageUrl}
                    alt={alt}
                    width={width}
                    height={height}
                    style={{
                        objectFit: 'cover',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        ...style
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                    preview={{
                        mask: <div style={{ color: 'white' }}><EyeOutlined /> Náhled</div>
                    }}
                />
            ) : (
                <img
                    src={imageUrl}
                    alt={alt}
                    style={{
                        width,
                        height,
                        objectFit: 'cover',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        ...style
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            )}
        </div>
    );
};

interface ItemFilter {
    defectType?: string;
    totalResult?: string;
    cameraNumber?: number;
    serialNumber?: string;
    itemId?: string;
}

const OrderDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [orderDetail, setOrderDetail] = useState<OrderDetailWithItems | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [filters, setFilters] = useState<ItemFilter>({});
    const [showFilters, setShowFilters] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);

    useEffect(() => {
        const fetchOrderDetail = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get(`/dashboard/orderDetailWithItems/${id}`);
                setOrderDetail(response.data);
                setFilteredItems(response.data.items);
            } catch (error) {
                console.error('Failed to fetch order detail:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetail();
    }, [id]);

    useEffect(() => {
        if (!orderDetail) return;

        let filtered = orderDetail.items;

        if (filters.defectType) {
            filtered = filtered.filter(item =>
                item.defectType.toLowerCase().includes(filters.defectType!.toLowerCase())
            );
        }
        if (filters.totalResult) {
            filtered = filtered.filter(item => item.totalResult === filters.totalResult);
        }
        if (filters.cameraNumber) {
            filtered = filtered.filter(item => item.cameraNumber === filters.cameraNumber);
        }
        if (filters.serialNumber) {
            filtered = filtered.filter(item =>
                item.serialNumber.toLowerCase().includes(filters.serialNumber!.toLowerCase())
            );
        }
        if (filters.itemId) {
            filtered = filtered.filter(item =>
                item.itemId.toLowerCase().includes(filters.itemId!.toLowerCase())
            );
        }

        setFilteredItems(filtered);
    }, [filters, orderDetail]);

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
                return <SettingOutlined />;
        }
    };

    const clearFilters = () => {
        setFilters({});
        setShowFilters(false);
    };

    const columns: ColumnsType<Item> = [
        {
            title: 'Item ID',
            dataIndex: 'itemId',
            key: 'itemId',
            width: 140,
            render: (text: string) => (
                <Text code copyable={{ text: text }}>
                    {text}
                </Text>
            ),
            sorter: (a, b) => a.itemId.localeCompare(b.itemId),
        },
        {
            title: 'Sériové číslo',
            dataIndex: 'serialNumber',
            key: 'serialNumber',
            width: 130,
            sorter: (a, b) => a.serialNumber.localeCompare(b.serialNumber),
        },
        {
            title: 'Čas kontroly',
            dataIndex: 'endInspectionTime',
            key: 'endInspectionTime',
            width: 160,
            render: (text: string) => (
                <Tooltip title={dayjs(text).format('dddd, MMMM D, YYYY')}>
                    {dayjs(text).format('DD.MM.YY HH:mm:ss')}
                </Tooltip>
            ),
            sorter: (a, b) => dayjs(a.endInspectionTime).unix() - dayjs(b.endInspectionTime).unix(),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Kamera',
            dataIndex: 'cameraNumber',
            key: 'cameraNumber',
            align: 'center',
            width: 80,
            render: (num: number) => (
                <Badge count={num} showZero style={{ backgroundColor: '#108ee9' }}>
                    <CameraOutlined style={{ fontSize: '16px' }} />
                </Badge>
            ),
            sorter: (a, b) => a.cameraNumber - b.cameraNumber,
        },
        {
            title: 'Defekt',
            dataIndex: 'defectType',
            key: 'defectType',
            width: 120,
            render: (text: string) => {
                if (!text || text === 'N/A') {
                    return <Text type="secondary">-</Text>;
                }
                return (
                    <Tooltip title={text}>
                        <Tag color="orange">{text}</Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Výsledky stanic',
            key: 'stationResults',
            width: 180,
            render: (_, record: Item) => (
                <Space>
                    <Tooltip title={`Stanice 1: ${record.station1Result}`}>
                        <Tag
                            color={getStatusColor(record.station1Result)}
                            icon={getStatusIcon(record.station1Result)}
                            style={{ fontSize: '12px', padding: '2px 6px' }}
                        >
                            1
                        </Tag>
                    </Tooltip>
                    <Tooltip title={`Stanice 2: ${record.station2Result}`}>
                        <Tag
                            color={getStatusColor(record.station2Result)}
                            icon={getStatusIcon(record.station2Result)}
                            style={{ fontSize: '12px', padding: '2px 6px' }}
                        >
                            2
                        </Tag>
                    </Tooltip>
                    <Tooltip title={`Stanice 3: ${record.station3Result}`}>
                        <Tag
                            color={getStatusColor(record.station3Result)}
                            icon={getStatusIcon(record.station3Result)}
                            style={{ fontSize: '12px', padding: '2px 6px' }}
                        >
                            3
                        </Tag>
                    </Tooltip>
                </Space>
            ),
        },
        {
            title: 'Celkový výsledek',
            dataIndex: 'totalResult',
            key: 'totalResult',
            align: 'center',
            width: 140,
            render: (result: string) => (
                <Tag
                    color={getStatusColor(result)}
                    icon={getStatusIcon(result)}
                    style={{ fontWeight: 'bold' }}
                >
                    {result}
                </Tag>
            ),
            filters: [
                { text: 'OK', value: 'OK' },
                { text: 'NOK', value: 'NOK' },
                { text: 'REWORK', value: 'REWORK' },
            ],
            onFilter: (value, record) => record.totalResult === value,
        },
        {
            title: 'Akce',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => {
                        setSelectedItem(record);
                        setDrawerVisible(true);
                    }}
                >
                    Detail
                </Button>
            ),
        },
    ];

    const renderFilterDrawer = () => (
        <Row gutter={[16, 16]}>
            <Col span={24}>
                <Text strong>Filtrovat kusy</Text>
            </Col>
            <Col span={12}>
                <Text>Výsledek:</Text>
                <Select
                    placeholder="Všechny výsledky"
                    style={{ width: '100%' }}
                    value={filters.totalResult}
                    onChange={(value) => setFilters(prev => ({ ...prev, totalResult: value }))}
                    allowClear
                >
                    <Option value="OK">OK</Option>
                    <Option value="NOK">NOK</Option>
                    <Option value="REWORK">REWORK</Option>
                </Select>
            </Col>
            <Col span={12}>
                <Text>Kamera:</Text>
                <Select
                    placeholder="Všechny kamery"
                    style={{ width: '100%' }}
                    value={filters.cameraNumber}
                    onChange={(value) => setFilters(prev => ({ ...prev, cameraNumber: value }))}
                    allowClear
                >
                    {[1, 2, 3, 4, 5].map(num => (
                        <Option key={num} value={num}>Kamera {num}</Option>
                    ))}
                </Select>
            </Col>
            <Col span={24}>
                <Text>Item ID:</Text>
                <Input
                    placeholder="Hledat podle Item ID"
                    value={filters.itemId}
                    onChange={(e) => setFilters(prev => ({ ...prev, itemId: e.target.value }))}
                    allowClear
                />
            </Col>
            <Col span={24}>
                <Text>Sériové číslo:</Text>
                <Input
                    placeholder="Hledat podle sériového čísla"
                    value={filters.serialNumber}
                    onChange={(e) => setFilters(prev => ({ ...prev, serialNumber: e.target.value }))}
                    allowClear
                />
            </Col>
            <Col span={24}>
                <Text>Defekt:</Text>
                <Input
                    placeholder="Hledat podle typu defektu"
                    value={filters.defectType}
                    onChange={(e) => setFilters(prev => ({ ...prev, defectType: e.target.value }))}
                    allowClear
                />
            </Col>
            <Col span={24}>
                <Space>
                    <Button onClick={clearFilters} icon={<ReloadOutlined />}>
                        Vymazat filtry
                    </Button>
                </Space>
            </Col>
        </Row>
    );

    if (loading || !orderDetail) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Načítání...</div>
            </div>
        );
    }

    const successRate = orderDetail.okPercentage || 0;
    const hasActiveFilters = Object.values(filters).some(f => f);

    return (
        <div style={{ padding: '0 24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* CSS styly přímo v komponente */}
            <style>
                {`
                .ant-table-row-selected {
                    background-color: #e6f7ff !important;
                }
                .ant-table-row-selected:hover {
                    background-color: #bae7ff !important;
                }
                `}
            </style>

            <Space style={{ marginBottom: 24 }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/dashboard')}
                    size="large"
                >
                    Zpět na Dashboard
                </Button>
                <Button
                    icon={<FilterOutlined />}
                    onClick={() => setShowFilters(!showFilters)}
                    type={hasActiveFilters ? 'primary' : 'default'}
                >
                    Filtry {hasActiveFilters && `(${Object.values(filters).filter(f => f).length})`}
                </Button>
            </Space>

            <Title level={2} style={{ marginBottom: 32 }}>
                Detail objednávky #{orderDetail.orderId}
            </Title>

            {/* Header s pokrokovým indikátorem */}
            <Card style={{ marginBottom: 24 }}>
                <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} lg={16}>
                        <Row gutter={[16, 16]}>
                            <Col span={6}>
                                <Statistic
                                    title="OK kusy"
                                    value={orderDetail.okCount}
                                    prefix={<CheckCircleOutlined />}
                                    valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="NOK kusy"
                                    value={orderDetail.nokCount}
                                    prefix={<CloseCircleOutlined />}
                                    valueStyle={{ color: '#ff4d4f', fontSize: '24px' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Rework"
                                    value={orderDetail.reworkCount}
                                    prefix={<ToolOutlined />}
                                    valueStyle={{ color: '#fa8c16', fontSize: '24px' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Celkem"
                                    value={orderDetail.totalCount}
                                    valueStyle={{ fontSize: '24px' }}
                                />
                            </Col>
                        </Row>
                    </Col>
                    <Col xs={24} lg={8}>
                        <div style={{ textAlign: 'center' }}>
                            <Progress
                                type="circle"
                                percent={successRate}
                                format={percent => `${percent?.toFixed(1)}%`}
                                size={120}
                                strokeColor={successRate >= 95 ? '#52c41a' : successRate >= 80 ? '#fa8c16' : '#ff4d4f'}
                            />
                            <div style={{ marginTop: 8 }}>
                                <Text strong style={{ fontSize: '16px' }}>Úspěšnost</Text>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Informace o objednávce */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={24}>
                    <Card title="Informace o objednávce" size="small">
                        <Descriptions column={{ xs: 1, sm: 2, md: 3, lg: 6 }} size="small">
                            <Descriptions.Item label="Order ID">
                                <Text code copyable={{ text: orderDetail.orderId.toString() }}>
                                    {orderDetail.orderId}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Order Number">
                                {orderDetail.orderNumber}
                            </Descriptions.Item>
                            <Descriptions.Item label="SKU">
                                {orderDetail.sku}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ref">
                                {orderDetail.ref}
                            </Descriptions.Item>
                            <Descriptions.Item label="Line Type">
                                <Tag color="blue">{orderDetail.lineType}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Datum zahájení">
                                {dayjs(orderDetail.orderBeginDate).format('DD.MM.YYYY HH:mm')}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
            </Row>

            {/* Filtry */}
            {showFilters && (
                <Card title="Filtry" style={{ marginBottom: 24 }}>
                    {renderFilterDrawer()}
                </Card>
            )}

            {/* Tabulka kusů */}
            <Card
                title={
                    <Space>
                        <Text strong>Seznam kusů</Text>
                        <Badge
                            count={filteredItems.length}
                            style={{ backgroundColor: '#108ee9' }}
                        />
                        {hasActiveFilters && (
                            <Text type="secondary">
                                (filtrováno z {orderDetail.items.length})
                            </Text>
                        )}
                    </Space>
                }
                style={{ marginBottom: 24 }}
            >
                <Table
                    columns={columns}
                    dataSource={filteredItems}
                    rowKey="id"
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} z ${total} kusů`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    scroll={{ x: 1200 }}
                    size="small"
                    rowClassName={(record) =>
                        selectedItem?.id === record.id ? 'ant-table-row-selected' : ''
                    }
                />
            </Card>

            {/* Drawer s detailem kusu - aktualizovaná část s obrázky */}
            <Drawer
                title={`Detail kusu ${selectedItem?.itemId || ''}`}
                placement="right"
                onClose={() => {
                    setDrawerVisible(false);
                    setSelectedItem(null);
                }}
                open={drawerVisible}
                width={600}
            >
                {selectedItem && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Descriptions title="Základní informace" column={1} size="middle" bordered>
                            <Descriptions.Item label="Item ID">
                                <Text code copyable={{ text: selectedItem.itemId }}>
                                    {selectedItem.itemId}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Sériové číslo">
                                {selectedItem.serialNumber}
                            </Descriptions.Item>
                            <Descriptions.Item label="Čas kontroly">
                                {dayjs(selectedItem.endInspectionTime).format('DD.MM.YYYY HH:mm:ss')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Kamera">
                                <Badge count={selectedItem.cameraNumber} showZero style={{ backgroundColor: '#108ee9' }}>
                                    <CameraOutlined style={{ fontSize: '18px' }} />
                                </Badge>
                            </Descriptions.Item>
                            <Descriptions.Item label="Typ defektu">
                                {selectedItem.defectType === 'N/A' || !selectedItem.defectType ? (
                                    <Text type="secondary">Bez defektu</Text>
                                ) : (
                                    <Tag color="orange">{selectedItem.defectType}</Tag>
                                )}
                            </Descriptions.Item>
                        </Descriptions>

                        <Card title="Výsledky kontrol" size="small">
                            <Row gutter={[16, 16]}>
                                {[
                                    { num: 1, result: selectedItem.station1Result },
                                    { num: 2, result: selectedItem.station2Result },
                                    { num: 3, result: selectedItem.station3Result },
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
                                        color={getStatusColor(selectedItem.totalResult)}
                                        icon={getStatusIcon(selectedItem.totalResult)}
                                        style={{ fontSize: '18px', padding: '8px 16px' }}
                                    >
                                        {selectedItem.totalResult}
                                    </Tag>
                                </div>
                            </div>
                        </Card>

                        {/* Aktualizovaná sekce s obrázky */}
                        <Card title="Obrázky ze stanic" size="small">
                            <Row gutter={[16, 16]}>
                                {[
                                    { label: 'Stanice 1', path: selectedItem.station1ImagePath },
                                    { label: 'Stanice 2', path: selectedItem.station2ImagePath },
                                    { label: 'Stanice 3', path: selectedItem.station3ImagePath },
                                ].map(({ label, path }, index) => (
                                    <Col span={24} key={index}>
                                        <Card size="small" title={label}>
                                            <SafeImage
                                                imagePath={path}
                                                alt={label}
                                                height={200}
                                                preview={true}
                                            />
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </Space>
                )}
            </Drawer>
        </div>
    );
};

export default OrderDetail;