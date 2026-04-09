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
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
    SearchOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { Recipe, DashboardStats, RecipeFilter } from '../types';

const { RangePicker } = DatePicker;

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
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
    const [filter, setFilter] = useState<RecipeFilter>({});

    const fetchRecipes = async (params: RecipeFilter = {}) => {
        setLoading(true);
        try {
            const response = await apiClient.get('/dashboard/recipes', { params });
            setRecipes(response.data.content);
            setPagination({
                current: response.data.currentPage + 1,
                pageSize: response.data.size,
                total: response.data.totalElements,
            });
        } catch (error) {
            console.error('Failed to fetch recipes:', error);
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
        fetchRecipes(filter);
        fetchStats();
    }, []);

    const columns: ColumnsType<Recipe> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Datum a čas',
            dataIndex: 'startTime',
            key: 'startTime',
            render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: 'ID dávky',
            dataIndex: 'batchId',
            key: 'batchId',
            render: (text: string) => <code>{text}</code>,
        },
        {
            title: 'Specifikace',
            dataIndex: 'specification',
            key: 'specification',
        },
        {
            title: 'OK',
            dataIndex: 'okCount',
            key: 'okCount',
            align: 'center',
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
        render: (count: number) => (
        <Tag color="error" icon={<CloseCircleOutlined />}>
        {count}
        </Tag>
    ),
    },
    {
        title: 'Celkem',
            dataIndex: 'totalCount',
        key: 'totalCount',
        align: 'center',
    },
    {
        title: 'Úspěšnost',
            dataIndex: 'successRate',
        key: 'successRate',
        align: 'center',
        render: (rate: number) => {
        const color = rate >= 95 ? 'success' : rate >= 80 ? 'warning' : 'error';
        return <Tag color={color}>{rate.toFixed(2)}%</Tag>;
    },
    },
    {
        title: 'Akce',
            key: 'action',
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
        fetchRecipes({ ...filter, page: 0 });
    };

    const handleReset = () => {
        setFilter({});
        fetchRecipes({});
    };

    return (
        <div>
            <h1 style={{ marginBottom: 24 }}>Dashboard</h1>

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
            title="Celkem zakázek"
    value={stats.totalRecipes}
    prefix={<FileTextOutlined />}
    />
    </Card>
    </Col>
    </Row>

    {/* Filtry */}
    <Card title="Filtry" style={{ marginBottom: 24 }}>
    <Space wrap>
    <RangePicker
        placeholder={['Od data', 'Do data']}
    onChange={(dates) => {
        setFilter({
            ...filter,
            dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
            dateTo: dates?.[1]?.format('YYYY-MM-DD'),
        });
    }}
    />
    <Input
    placeholder="ID dávky"
    value={filter.dmCode}
    onChange={(e) => setFilter({ ...filter, dmCode: e.target.value })}
    style={{ width: 200 }}
    />
    <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
        Filtrovat
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>
        Reset
        </Button>
        </Space>
        </Card>

    {/* Tabulka */}
    <Card title="Zakázky">
    <Table
        columns={columns}
    dataSource={recipes}
    loading={loading}
    rowKey="id"
    pagination={{
    ...pagination,
            onChange: (page, pageSize) => {
            fetchRecipes({ ...filter, page: page - 1, size: pageSize });
        },
    }}
    />
    </Card>
    </div>
);
};

export default Dashboard;