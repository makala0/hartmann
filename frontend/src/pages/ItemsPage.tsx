import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Checkbox, Col, Drawer, InputNumber, Row, Space, Table, Tag } from 'antd';
import { AlertOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, LeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined, ToolOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { Item, ItemListFilter } from '../types';
import ItemDetailContent from '../components/ItemDetailContent';
import { useLanguage } from '../i18n/LanguageContext';

const ItemsPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [filter, setFilter] = useState<ItemListFilter>({});
    const [appliedFilter, setAppliedFilter] = useState<ItemListFilter>({});
    const { current: currentPage, pageSize } = pagination;
    const { t } = useLanguage();

    const selectedItemIndex = selectedItem
        ? items.findIndex(item => item.id === selectedItem.id)
        : -1;
    const hasPreviousItem = selectedItemIndex > 0;
    const hasNextItem = selectedItemIndex >= 0 && selectedItemIndex < items.length - 1;

    const selectAdjacentItem = (direction: -1 | 1) => {
        if (selectedItemIndex < 0) {
            return;
        }

        const nextItem = items[selectedItemIndex + direction];
        if (nextItem) {
            setSelectedItem(nextItem);
        }
    };

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/dashboard/items', {
                params: {
                    ...appliedFilter,
                    page: currentPage - 1,
                    size: pageSize,
                },
            });
            setItems(response.data.content);
            setPagination(prev => ({
                ...prev,
                current: response.data.currentPage + 1,
                pageSize: response.data.size,
                total: response.data.totalElements,
            }));
        } catch (error) {
            console.error('Failed to fetch items:', error);
        } finally {
            setLoading(false);
        }
    }, [appliedFilter, currentPage, pageSize]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

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

    const columns: ColumnsType<Item> = [
        {
            title: t('field.itemId'),
            dataIndex: 'itemId',
            key: 'itemId',
            width: 140,
            render: (text: string) => <code>{text}</code>,
        },
        {
            title: t('field.orderId'),
            dataIndex: 'orderId',
            key: 'orderId',
            width: 120,
        },
        {
            title: t('field.orderNumber'),
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            width: 130,
        },
        {
            title: t('field.serialNumber'),
            dataIndex: 'serialNumber',
            key: 'serialNumber',
            width: 150,
        },
        {
            title: t('field.inspectionTime'),
            dataIndex: 'endInspectionTime',
            key: 'endInspectionTime',
            width: 170,
            render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: t('field.camera'),
            dataIndex: 'cameraNumber',
            key: 'cameraNumber',
            align: 'center',
            width: 90,
        },
        {
            title: t('field.result'),
            dataIndex: 'totalResult',
            key: 'totalResult',
            align: 'center',
            width: 110,
            render: (result: string) => (
                <Tag color={getStatusColor(result)} icon={getStatusIcon(result)}>
                    {result}
                </Tag>
            ),
        },
        {
            title: t('field.warning'),
            dataIndex: 'attentionFlag',
            key: 'attentionFlag',
            align: 'center',
            width: 110,
            render: (value: boolean) => <Tag color={value ? 'warning' : 'default'}>{value ? t('common.yes') : t('common.no')}</Tag>,
        },
        {
            title: t('field.critical'),
            dataIndex: 'criticalFlag',
            key: 'criticalFlag',
            align: 'center',
            width: 100,
            render: (value: boolean) => <Tag color={value ? 'error' : 'default'}>{value ? t('common.yes') : t('common.no')}</Tag>,
        },
        {
            title: t('field.defect'),
            dataIndex: 'defectType',
            key: 'defectType',
            width: 120,
            render: (value: string) => value && value !== 'N/A' ? <Tag color="orange">{value}</Tag> : t('items.noDefect'),
        },
        {
            title: t('common.actions'),
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Button type="primary" size="small" onClick={() => setSelectedItem(record)}>
                    {t('common.detail')}
                </Button>
            ),
        },
    ];

    const handleSearch = () => {
        setAppliedFilter(filter);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleReset = () => {
        setFilter({});
        setAppliedFilter({});
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    return (
        <div>
            <Card title={t('items.itemFilters')} style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} sm={12} md={8}>
                        <label>{t('field.orderId')}:</label>
                        <InputNumber
                            placeholder={t('field.orderId')}
                            style={{ width: '100%' }}
                            value={filter.orderId}
                            onChange={(value) => setFilter({ ...filter, orderId: value || undefined })}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <label>{t('items.flags')}:</label>
                        <div
                            style={{
                                display: 'flex',
                                gap: 12,
                                alignItems: 'center',
                                width: '100%',
                                padding: '5px 10px',
                                border: '1px solid #d9d9d9',
                                borderRadius: 8,
                                background: '#fff',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Checkbox
                                checked={filter.attentionFlag === true}
                                onChange={(event) => setFilter({
                                    ...filter,
                                    attentionFlag: event.target.checked ? true : undefined,
                                })}
                            >
                                <ExclamationCircleOutlined style={{ color: '#d48806' }} /> {t('field.warning')}
                            </Checkbox>
                            <Checkbox
                                checked={filter.criticalFlag === true}
                                onChange={(event) => setFilter({
                                    ...filter,
                                    criticalFlag: event.target.checked ? true : undefined,
                                })}
                            >
                                <AlertOutlined style={{ color: '#cf1322' }} /> {t('field.critical')}
                            </Checkbox>
                        </div>
                    </Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                                Filtrovat
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>
                                Reset
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Card title={t('items.itemList')}>
                <Table
                    columns={columns}
                    dataSource={items}
                    loading={loading}
                    rowKey="id"
                    scroll={{ x: 1340 }}
                    onRow={(record) => ({
                        onDoubleClick: () => setSelectedItem(record),
                    })}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} / ${total} ${t('dashboard.itemsTotal')}`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        onChange: (page, pageSize) => {
                            setPagination(prev => ({
                                ...prev,
                                current: page,
                                pageSize: pageSize || prev.pageSize,
                            }));
                        },
                    }}
                />
            </Card>

            <Drawer
                title={`${t('items.detailTitle')} ${selectedItem?.itemId || ''}`}
                extra={selectedItem && (
                    <Space>
                        <Button
                            icon={<LeftOutlined />}
                            disabled={!hasPreviousItem}
                            onClick={() => selectAdjacentItem(-1)}
                        >
                            {t('common.previous')}
                        </Button>
                        <Button
                            icon={<RightOutlined />}
                            disabled={!hasNextItem}
                            onClick={() => selectAdjacentItem(1)}
                        >
                            {t('common.next')}
                        </Button>
                    </Space>
                )}
                placement="right"
                open={Boolean(selectedItem)}
                onClose={() => setSelectedItem(null)}
                width="100vw"
            >
                {selectedItem && (
                    <ItemDetailContent
                        item={selectedItem}
                        onItemChange={(updatedItem) => {
                            setSelectedItem(updatedItem);
                            setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
                        }}
                    />
                )}
            </Drawer>
        </div>
    );
};

export default ItemsPage;
