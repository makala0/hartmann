import React, { useEffect, useState } from 'react';
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

const { RangePicker } = DatePicker;

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

    const fetchOrders = async (params: OrderFilter = {}) => {
        setLoading(true);
        try {
            const response = await apiClient.get('/dashboard/orders', { params });
            setOrders(response.data.content);
            setPagination({
                current: response.data.currentPage + 1,
                pageSize: response.data.size,
                total: response.data.totalElements,
            });
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/dashboard/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    useEffect(() => {
        fetchOrders(filter);
        fetchStats();
    }, []);

    const columns: ColumnsType<Order> = [
        {
            title: 'Order ID',
            dataIndex: 'orderId',
            key: 'orderId',
            width: 120,
            render: (text: string) => <code>{text}</code>,
        },
        {
            title: 'Order Number',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            width: 130,
        },
        {
            title: 'Datum zahájení',
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
            title: 'Celkem',
            dataIndex: 'totalCount',
            key: 'totalCount',
            align: 'center',
            width: 80,
        },
        {
            title: 'Úspěšnost',
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
            title: 'Akce',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    onClick={() => navigate(`/dashboard/${record.id}`)}
                >
                    Detail
                </Button>
            ),
        },
    ];

    const handleSearch = () => {
        fetchOrders({ ...filter, page: 0 });
    };

    const handleReset = () => {
        setFilter({});
        fetchOrders({});
    };

    return (
        <div>
            <h1 style={{ marginBottom: 24 }}>Dashboard - Objednávky</h1>

            {/* Statistiky */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="OK kusů"
                            value={stats.okCount}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="NOK kusů"
                            value={stats.nokCount}
                            valueStyle={{ color: '#ff4d4f' }}
                            prefix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Celkem objednávek"
                            value={stats.totalRecipes}
                            prefix={<FileTextOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filtry */}
            <Card title="Filtry objednávek" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8}>
                        <label>Datum zahájení:</label>
                        <RangePicker
                            placeholder={['Od data', 'Do data']}
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
                        <label>Line Type:</label>
                        <Input
                            placeholder="Line Type"
                            value={filter.lineType}
                            onChange={(e) => setFilter({ ...filter, lineType: e.target.value })}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <label>Order ID:</label>
                        <InputNumber
                            placeholder="Order ID"
                            style={{ width: '100%' }}
                            value={filter.orderId}
                            onChange={(value) => setFilter({ ...filter, orderId: value || undefined })}
                        />
                    </Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={24} sm={12} md={8}>
                        <label>Order Number:</label>
                        <InputNumber
                            placeholder="Order Number"
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
                        <label>Ref:</label>
                        <Input
                            placeholder="Ref"
                            value={filter.ref}
                            onChange={(e) => setFilter({ ...filter, ref: e.target.value })}
                        />
                    </Col>
                </Row>
                <Row style={{ marginTop: 16 }}>
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

            {/* Tabulka */}
            <Card title="Seznam objednávek">
                <Table
                    columns={columns}
                    dataSource={orders}
                    loading={loading}
                    rowKey="id"
                    scroll={{ x: 1000 }}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} z ${total} objednávek`,
                        onChange: (page, pageSize) => {
                            fetchOrders({ ...filter, page: page - 1, size: pageSize });
                        },
                    }}
                />
            </Card>
        </div>
    );
};

export default Dashboard;