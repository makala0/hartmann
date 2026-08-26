import React, { useCallback, useEffect, useState } from 'react';
import {
    Card,
    Table,
    Statistic,
    Row,
    Col,
    Button,
    Space,
    Tag,
    Typography,
    Descriptions,
    Divider,
    Progress,
    Tooltip,
    Badge,
    Checkbox,
    Select,
    Input,
    Drawer,
    Spin,
    message,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ArrowLeftOutlined,
    LeftOutlined,
    RightOutlined,
    ToolOutlined,
    EyeOutlined,
    ReloadOutlined,
    FilterOutlined,
    SettingOutlined,
    CameraOutlined,
    SaveOutlined,
    AlertOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { OrderDetailWithItems, Item } from '../types';
import ItemDetailContent from '../components/ItemDetailContent';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ItemFilter {
    defectType?: string;
    totalResult?: string;
    cameraNumber?: number;
    serialNumber?: string;
    itemId?: string;
    attentionFlag?: boolean;
    criticalFlag?: boolean;
}

const OrderDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [orderDetail, setOrderDetail] = useState<OrderDetailWithItems | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [navigatingItem, setNavigatingItem] = useState(false);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [filters, setFilters] = useState<ItemFilter>({});
    const [itemPagination, setItemPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [commentValue, setCommentValue] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const { current: currentPage, pageSize } = itemPagination;
    const { t } = useLanguage();

    const selectedItemIndex = selectedItem
        ? filteredItems.findIndex(item => item.id === selectedItem.id)
        : -1;
    const hasPreviousItem = selectedItemIndex > 0 || (selectedItemIndex === 0 && currentPage > 1);
    const hasNextItem = selectedItemIndex >= 0
        && ((currentPage - 1) * pageSize + selectedItemIndex + 1 < itemPagination.total);

    const selectAdjacentItem = useCallback(async (direction: -1 | 1) => {
        if (selectedItemIndex < 0 || navigatingItem || !id) {
            return;
        }

        const nextItem = filteredItems[selectedItemIndex + direction];
        if (nextItem) {
            setSelectedItem(nextItem);
            return;
        }

        const targetPage = currentPage + direction;
        if (targetPage < 1 || (targetPage - 1) * pageSize >= itemPagination.total) {
            return;
        }

        setNavigatingItem(true);
        try {
            const response = await apiClient.get(`/dashboard/orderDetailWithItems/${id}`, {
                params: { ...filters, page: targetPage - 1, size: pageSize },
            });
            const targetItems: Item[] = response.data.items;
            const targetItem = direction === 1 ? targetItems[0] : targetItems[targetItems.length - 1];

            setOrderDetail(response.data);
            setFilteredItems(targetItems);
            setItemPagination(prev => ({
                ...prev,
                current: response.data.currentPage + 1,
                pageSize: response.data.size,
                total: response.data.totalElements,
            }));
            if (targetItem) {
                setSelectedItem(targetItem);
            }
        } catch (error) {
            console.error('Failed to fetch adjacent item:', error);
        } finally {
            setNavigatingItem(false);
        }
    }, [currentPage, filteredItems, filters, id, itemPagination.total, navigatingItem, pageSize, selectedItemIndex]);

    useEffect(() => {
        if (!selectedItem) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) {
                return;
            }
            if (event.key === 'ArrowLeft' && hasPreviousItem) {
                event.preventDefault();
                void selectAdjacentItem(-1);
            } else if (event.key === 'ArrowRight' && hasNextItem) {
                event.preventDefault();
                void selectAdjacentItem(1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasNextItem, hasPreviousItem, selectAdjacentItem, selectedItem]);

    useEffect(() => {
        const fetchOrderDetail = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get(`/dashboard/orderDetailWithItems/${id}`, {
                    params: {
                        ...filters,
                        page: currentPage - 1,
                        size: pageSize,
                    },
                });
                setOrderDetail(response.data);
                setFilteredItems(response.data.items);
                setItemPagination(prev => ({
                    ...prev,
                    current: response.data.currentPage + 1,
                    pageSize: response.data.size,
                    total: response.data.totalElements,
                }));
                setCommentValue(response.data.comment || '');
            } catch (error) {
                console.error('Failed to fetch order detail:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetail();
    }, [id, filters, currentPage, pageSize]);

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

    const updateFilters = (newFilters: Partial<ItemFilter>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setItemPagination(prev => ({ ...prev, current: 1 }));
    };

    const clearFilters = () => {
        setFilters({});
        setItemPagination(prev => ({ ...prev, current: 1 }));
        setShowFilters(false);
    };

    const handleSaveComment = async () => {
        if (!id) return;

        setSavingComment(true);
        try {
            const response = await apiClient.put(`/dashboard/order/${id}/comment`, {
                comment: commentValue,
            });
            setOrderDetail(response.data);
            setFilteredItems(response.data.items);
            setCommentValue(response.data.comment || '');
            message.success(t('order.commentSaved'));
        } catch (error) {
            console.error('Failed to save order comment:', error);
            message.error(t('order.commentSaveFailed'));
        } finally {
            setSavingComment(false);
        }
    };

    const columns: ColumnsType<Item> = [
        {
            title: t('field.itemId'),
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
            title: t('field.serialNumber'),
            dataIndex: 'serialNumber',
            key: 'serialNumber',
            width: 130,
            sorter: (a, b) => a.serialNumber.localeCompare(b.serialNumber),
        },
        {
            title: t('field.inspectionTime'),
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
            title: t('field.camera'),
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
            title: 'Typ vady',
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
            title: t('itemDetail.checkResults'),
            key: 'stationResults',
            width: 180,
            render: (_, record: Item) => (
                <Space>
                    <Tooltip title={`${t('itemDetail.station')} 1: ${record.station1Result}`}>
                        <Tag
                            color={getStatusColor(record.station1Result)}
                            icon={getStatusIcon(record.station1Result)}
                            style={{ fontSize: '12px', padding: '2px 6px' }}
                        >
                            1
                        </Tag>
                    </Tooltip>
                    <Tooltip title={`${t('itemDetail.station')} 2: ${record.station2Result}`}>
                        <Tag
                            color={getStatusColor(record.station2Result)}
                            icon={getStatusIcon(record.station2Result)}
                            style={{ fontSize: '12px', padding: '2px 6px' }}
                        >
                            2
                        </Tag>
                    </Tooltip>
                    <Tooltip title={`${t('itemDetail.station')} 3: ${record.station3Result}`}>
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
            title: t('field.totalResult'),
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
            title: t('field.warning'),
            dataIndex: 'attentionFlag',
            key: 'attentionFlag',
            align: 'center',
            width: 110,
            render: (value: boolean) => (
                <Tag color={value ? 'warning' : 'default'} icon={value ? <ExclamationCircleOutlined /> : undefined}>
                    {value ? t('common.yes') : t('common.no')}
                </Tag>
            ),
        },
        {
            title: t('field.critical'),
            dataIndex: 'criticalFlag',
            key: 'criticalFlag',
            align: 'center',
            width: 100,
            render: (value: boolean) => (
                <Tag color={value ? 'error' : 'default'} icon={value ? <AlertOutlined /> : undefined}>
                    {value ? t('common.yes') : t('common.no')}
                </Tag>
            ),
        },
        {
            title: t('common.actions'),
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
                    {t('common.detail')}
                </Button>
            ),
        },
    ];

    // @ts-ignore
    const renderFilterDrawer = () => (
        <Row gutter={[16, 16]}>
            <Col span={24}>
                <Text strong>{t('order.filterItems')}</Text>
            </Col>
            <Col span={12}>
                <Text>{t('field.result')}:</Text>
                <Select
                    placeholder={t('placeholder.allResults')}
                    style={{ width: '100%' }}
                    value={filters.totalResult}
                    onChange={(value) => updateFilters({ totalResult: value })}
                    allowClear
                >
                    <Option value="OK">OK</Option>
                    <Option value="NOK">NOK</Option>
                    <Option value="REWORK">REWORK</Option>
                </Select>
            </Col>
            <Col span={12}>
                <Text>{t('field.camera')}:</Text>
                <Select
                    placeholder={t('placeholder.allCameras')}
                    style={{ width: '100%' }}
                    value={filters.cameraNumber}
                    onChange={(value) => updateFilters({ cameraNumber: value })}
                    allowClear
                >
                    {[1, 2, 3, 4, 5].map(num => (
                        <Option key={num} value={num}>{t('field.camera')} {num}</Option>
                    ))}
                </Select>
            </Col>
            <Col span={24}>
                <Text>{t('field.itemId')}:</Text>
                <Input
                    placeholder={t('placeholder.searchItemId')}
                    value={filters.itemId}
                    onChange={(e) => updateFilters({ itemId: e.target.value })}
                    allowClear
                />
            </Col>
            <Col span={24}>
                <Text>{t('field.serialNumber')}:</Text>
                <Input
                    placeholder={t('placeholder.searchSerial')}
                    value={filters.serialNumber}
                    onChange={(e) => updateFilters({ serialNumber: e.target.value })}
                    allowClear
                />
            </Col>
            <Col span={24}>
                <Text>Typ vady:</Text>
                <Input
                    placeholder="Hledat podle typu vady"
                    value={filters.defectType}
                    onChange={(e) => updateFilters({ defectType: e.target.value })}
                    allowClear
                />
            </Col>
            <Col span={24}>
                <Text>{t('items.flags')}:</Text>
                <div
                    style={{
                        display: 'flex',
                        gap: 24,
                        marginTop: 8,
                        padding: '8px 12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: 8,
                    }}
                >
                    <Checkbox
                        checked={filters.attentionFlag === true}
                        onChange={(event) => updateFilters({
                            attentionFlag: event.target.checked ? true : undefined,
                        })}
                    >
                        <ExclamationCircleOutlined style={{ color: '#d48806' }} /> {t('field.warning')}
                    </Checkbox>
                    <Checkbox
                        checked={filters.criticalFlag === true}
                        onChange={(event) => updateFilters({
                            criticalFlag: event.target.checked ? true : undefined,
                        })}
                    >
                        <AlertOutlined style={{ color: '#cf1322' }} /> {t('field.critical')}
                    </Checkbox>
                </div>
            </Col>
            <Col span={24}>
                <Space>
                    <Button onClick={clearFilters} icon={<ReloadOutlined />}>
                        {t('order.clearFilters')}
                    </Button>
                </Space>
            </Col>
        </Row>
    );

    if (loading || !orderDetail) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>{t('common.loading')}</div>
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
                    {t('order.backToDashboard')}
                </Button>
                <Button
                    icon={<FilterOutlined />}
                    onClick={() => setShowFilters(!showFilters)}
                    type={hasActiveFilters ? 'primary' : 'default'}
                >
                    {t('common.filters')} {hasActiveFilters && `(${Object.values(filters).filter(f => f).length})`}
                </Button>
            </Space>

            <Title level={2} style={{ marginBottom: 32 }}>
                Detail zakázky #{orderDetail.orderId}
            </Title>

            {/* Header s pokrokovým indikátorem */}
            <Card style={{ marginBottom: 24 }}>
                <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} lg={16}>
                        <Row gutter={[16, 16]}>
                            <Col span={6}>
                                <Statistic
                                    title={t('order.okItems')}
                                    value={orderDetail.okCount}
                                    prefix={<CheckCircleOutlined />}
                                    valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title={t('order.nokItems')}
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
                                    title={t('field.total')}
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
                                <Text strong style={{ fontSize: '16px' }}>{t('field.successRate')}</Text>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Informace o objednávce */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={24}>
                    <Card title="Informace o zakázce" size="small">
                        <Descriptions column={{ xs: 1, sm: 2, md: 3, lg: 6 }} size="small">
                            <Descriptions.Item label={t('field.orderId')}>
                                <Text code copyable={{ text: orderDetail.orderId.toString() }}>
                                    {orderDetail.orderId}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={t('field.orderNumber')}>
                                {orderDetail.orderNumber}
                            </Descriptions.Item>
                            <Descriptions.Item label="SKU">
                                {orderDetail.sku}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ref">
                                {orderDetail.ref}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('field.lineType')}>
                                <Tag color="blue">{orderDetail.lineType}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label={t('field.recipe')}>
                                {orderDetail.recipe}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('field.startDate')}>
                                {dayjs(orderDetail.orderBeginDate).format('DD.MM.YYYY HH:mm')}
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '16px 0' }} />
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <Text strong>{t('field.comment')}</Text>
                            <TextArea
                                placeholder="Přidat komentář k zakázce"
                                value={commentValue}
                                onChange={(event) => setCommentValue(event.target.value)}
                                autoSize={{ minRows: 3, maxRows: 6 }}
                                maxLength={4000}
                                showCount
                            />
                            <div style={{ textAlign: 'right' }}>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    loading={savingComment}
                                    onClick={handleSaveComment}
                                >
                                    {t('order.saveComment')}
                                </Button>
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* Filtry */}
            {showFilters && (
                <Card title={t('common.filters')} style={{ marginBottom: 24 }}>
                    {renderFilterDrawer()}
                </Card>
            )}

            {/* Tabulka kusů */}
            <Card
                title={
                    <Space>
                        <Text strong>{t('order.itemList')}</Text>
                        <Badge
                            count={itemPagination.total}
                            style={{ backgroundColor: '#108ee9' }}
                        />
                        {hasActiveFilters && (
                            <Text type="secondary">
                                ({t('order.filteredFrom')} {orderDetail.totalCount})
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
                        current: itemPagination.current,
                        pageSize: itemPagination.pageSize,
                        total: itemPagination.total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} / ${total} ${t('dashboard.itemsTotal')}`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        onChange: (page, pageSize) => {
                            setItemPagination(prev => ({
                                ...prev,
                                current: page,
                                pageSize: pageSize || prev.pageSize,
                            }));
                        },
                    }}
                    scroll={{ x: 1420 }}
                    size="small"
                    rowClassName={(record) =>
                        selectedItem?.id === record.id ? 'ant-table-row-selected' : ''
                    }
                />
            </Card>

            {/* Drawer s detailem kusu - aktualizovaná část s obrázky */}
            <Drawer
                title={`${t('items.detailTitle')} ${selectedItem?.itemId || ''}`}
                extra={selectedItem && (
                    <Space>
                        <Button
                            icon={<LeftOutlined />}
                            disabled={!hasPreviousItem || navigatingItem}
                            onClick={() => selectAdjacentItem(-1)}
                        >
                            {t('common.previous')}
                        </Button>
                        <Button
                            icon={<RightOutlined />}
                            disabled={!hasNextItem || navigatingItem}
                            onClick={() => selectAdjacentItem(1)}
                        >
                            {t('common.next')}
                        </Button>
                    </Space>
                )}
                placement="right"
                onClose={() => {
                    setDrawerVisible(false);
                    setSelectedItem(null);
                }}
                open={drawerVisible}
                width="100vw"
            >
                {selectedItem && (
                    <ItemDetailContent
                        item={selectedItem}
                        onItemChange={(updatedItem) => {
                            setSelectedItem(updatedItem);
                            setFilteredItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
                            setOrderDetail(prev => prev
                                ? {
                                    ...prev,
                                    items: prev.items.map(item => item.id === updatedItem.id ? updatedItem : item),
                                }
                                : prev
                            );
                        }}
                    />
                )}
            </Drawer>
        </div>
    );
};

export default OrderDetail;
