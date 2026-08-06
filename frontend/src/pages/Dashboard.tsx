import React, { useCallback, useEffect, useState } from 'react';
import {
    Card,
    Table,
    Statistic,
    Row,
    Col,
    DatePicker,
    Input,
    Button,
    Space,
    Tag,
    InputNumber,
    Select,
    AutoComplete,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
    SearchOutlined,
    ReloadOutlined,
    ToolOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { Order, DashboardStats, OrderFilter } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const { RangePicker } = DatePicker;

const LINE_TYPE_OPTIONS = [
    { value: 'GAW2', label: 'GAW2' },
];

const RECIPE_OPTIONS = [
    'REF277508',
    'REF277516',
    'REF936275',
    'REF938800',
    'REF938857',
    'REF277547',
].map((recipe) => ({ value: recipe, label: recipe }));

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        okCount: 0,
        nokCount: 0,
        totalRecipes: 0,
    });
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [filter, setFilter] = useState<OrderFilter>({});
    const [appliedFilter, setAppliedFilter] = useState<OrderFilter>({});
    const { current: currentPage, pageSize } = pagination;
    const { t } = useLanguage();

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/dashboard/orders', {
                params: {
                    ...appliedFilter,
                    page: currentPage - 1,
                    size: pageSize,
                },
            });
            setOrders(response.data.content);
            setPagination(prev => ({
                ...prev,
                current: response.data.currentPage + 1,
                pageSize: response.data.size,
                total: response.data.totalElements,
            }));
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    }, [appliedFilter, currentPage, pageSize]);

    // const fetchStats = async () => {
    //     try {
    //         const response = await apiClient.get('/dashboard/stats');
    //         setStats(response.data);
    //     } catch (error) {
    //         console.error('Failed to fetch stats:', error);
    //     }
    // };

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const columns: ColumnsType<Order> = [
        {
            title: t('field.orderId'),
            dataIndex: 'orderId',
            key: 'orderId',
            width: 120,
            render: (text: string) => <code>{text}</code>,
        },
        {
            title: t('field.orderNumber'),
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            width: 130,
        },
        {
            title: t('field.lineType'),
            dataIndex: 'lineType',
            key: 'lineType',
            width: 110,
        },
        {
            title: 'SKU',
            dataIndex: 'sku',
            key: 'sku',
            width: 130,
        },
        {
            title: t('field.recipe'),
            dataIndex: t('field.recipe'),
            key: 'recipe',
            width: 130,
        },
        {
            title: t('field.startDate'),
            dataIndex: 'orderBeginDate',
            key: 'orderBeginDate',
            width: 160,
            render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: 'OK',
            dataIndex: 'okCount',
            key: 'okCount',
            align: 'center',
            width: 80,
            render: (count: number) => (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                    {count}
                </Tag>
            ),
        },
        {
            title: 'NOK',
            dataIndex: 'nokCount',
            key: 'nokCount',
            align: 'center',
            width: 80,
            render: (count: number) => (
                <Tag color="error" icon={<CloseCircleOutlined />}>
                    {count}
                </Tag>
            ),
        },
        {
            title: 'Rework',
            dataIndex: 'reworkCount',
            key: 'reworkCount',
            align: 'center',
            width: 80,
            render: (count: number) => (
                <Tag color="warning" icon={<ToolOutlined />}>
                    {count}
                </Tag>
            ),
        },
        {
            title: t('field.total'),
            dataIndex: 'totalCount',
            key: 'totalCount',
            align: 'center',
            width: 80,
        },
        {
            title: t('field.successRate'),
            dataIndex: 'okPercentage',
            key: 'okPercentage',
            align: 'center',
            width: 100,
            render: (rate: number) => {
                const color = rate >= 95 ? 'success' : rate >= 80 ? 'warning' : 'error';
                return <Tag color={color}>{rate.toFixed(2)}%</Tag>;
            },
        },
        {
            title: t('common.actions'),
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    onClick={() => navigate(`/dashboard/${record.id}`)}
                >
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
            {/* Statistiky */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title={t('dashboard.okItems')}
                            value={stats.okCount}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title={t('dashboard.nokItems')}
                            value={stats.nokCount}
                            valueStyle={{ color: '#ff4d4f' }}
                            prefix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title={t('dashboard.totalOrders')}
                            value={stats.totalRecipes}
                            prefix={<FileTextOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filtry */}
            <Card title={t('dashboard.orderFilters')} style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8}>
                        <label>{t('field.startDate')}:</label>
                        <RangePicker
                            placeholder={[t('placeholder.dateFrom'), t('placeholder.dateTo')]}
                            style={{ width: '100%' }}
                            onChange={(dates) => {
                                setFilter({
                                    ...filter,
                                    dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
                                    dateTo: dates?.[1]?.format('YYYY-MM-DD'),
                                });
                            }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <label>{t('field.lineType')}:</label>
                        <Select
                            allowClear
                            placeholder={t('field.lineType')}
                            style={{ width: '100%' }}
                            value={filter.lineType}
                            options={LINE_TYPE_OPTIONS}
                            onChange={(value) => setFilter({ ...filter, lineType: value })}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <label>{t('field.orderId')}:</label>
                        <InputNumber
                            placeholder={t('field.orderId')}
                            style={{ width: '100%' }}
                            value={filter.orderId}
                            onChange={(value) => setFilter({ ...filter, orderId: value || undefined })}
                        />
                    </Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={24} sm={12} md={8}>
                        <label>{t('field.orderNumber')}:</label>
                        <InputNumber
                            placeholder={t('field.orderNumber')}
                            style={{ width: '100%' }}
                            value={filter.orderNumber}
                            onChange={(value) => setFilter({ ...filter, orderNumber: value || undefined })}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <label>SKU:</label>
                        <Input
                            placeholder="SKU"
                            value={filter.sku}
                            onChange={(e) => setFilter({ ...filter, sku: e.target.value })}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <label>{t('field.recipe')}:</label>
                        <AutoComplete
                            allowClear
                            placeholder={t('field.recipe')}
                            style={{ width: '100%' }}
                            value={filter.recipe}
                            options={RECIPE_OPTIONS}
                            filterOption={(inputValue, option) =>
                                Boolean(option?.value.toUpperCase().includes(inputValue.toUpperCase()))
                            }
                            onChange={(value) => setFilter({ ...filter, recipe: value || undefined })}
                        />
                    </Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>

                    <Col style={{ marginTop: 22 }}>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                                {t('common.filter')}
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>
                                {t('common.reset')}
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Tabulka */}
            <Card title={t('dashboard.orderList')}>
                <Table
                    columns={columns}
                    dataSource={orders}
                    loading={loading}
                    rowKey="id"
                    scroll={{ x: 1240 }}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} / ${total} ${t('dashboard.ordersTotal')}`,
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
        </div>
    );
};

export default Dashboard;