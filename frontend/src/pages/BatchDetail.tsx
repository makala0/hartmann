import React, { useEffect, useState } from 'react';
import {
    Card,
    Descriptions,
    Table,
    Tag,
    Collapse,
    Statistic,
    Row,
    Col,
    Button,
    Space,
    Image,
    Badge,
    Timeline, Divider,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ArrowLeftOutlined,
    WarningOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import type { BatchDetailDto, Product, StationResult, Defect } from '../types';

const { Panel } = Collapse;

const BatchDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [batchDetail, setBatchDetail] = useState<BatchDetailDto | null>(null);

    useEffect(() => {
        fetchBatchDetail();
    }, [id]);

    const fetchBatchDetail = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/dashboard/batch/${id}`);
            setBatchDetail(response.data);
        } catch (error) {
            console.error('Failed to fetch batch detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'OK':
                return 'success';
            case 'NOK':
                return 'error';
            default:
                return 'default';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'critical':
            case 'vysoká':
                return 'error';
            case 'major':
            case 'střední':
                return 'warning';
            case 'minor':
            case 'nízká':
                return 'default';
            default:
                return 'default';
        }
    };

    const productColumns: ColumnsType<Product> = [
        {
            title: 'ID produktu',
            dataIndex: 'productId',
            key: 'productId',
            render: (text: string) => <code>{text}</code>,
        },
        {
            title: 'DM Code',
            dataIndex: 'dmCode',
            key: 'dmCode',
            render: (text: string) => <code style={{ fontSize: '11px' }}>{text}</code>,
        },
        {
            title: 'EAN Code',
            dataIndex: 'eanCode',
            key: 'eanCode',
        },
        {
            title: 'Čas',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text: string) => (
                <span>
          <ClockCircleOutlined /> {dayjs(text).format('HH:mm:ss')}
        </span>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status: string) => (
                <Tag
                    icon={status === 'OK' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    color={getStatusColor(status)}
                >
                    {status}
                </Tag>
            ),
        },
        {
            title: 'Stanice',
            key: 'stations',
            render: (_, record) => <Badge count={record.stationResults?.length || 0} />,
        },
    ];

    const renderStationResults = (stationResults: StationResult[]) => {
        if (!stationResults || stationResults.length === 0) {
            return <p style={{ color: '#999' }}>Žádné výsledky ze stanic</p>;
        }

        return (
            <Timeline mode="left">
                {stationResults.map((station) => (
                    <Timeline.Item
                        key={station.id}
                        color={station.result === 'OK' ? 'green' : 'red'}
                        label={dayjs(station.timestamp).format('HH:mm:ss')}
                    >
                        <Card size="small" style={{ marginBottom: 8 }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div>
                                    <strong>{station.station}</strong>
                                    <Tag
                                        color={getStatusColor(station.result)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        {station.result}
                                    </Tag>
                                </div>

                                {station.defects && station.defects.length > 0 && (
                                    <div>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <strong>
                                            <WarningOutlined /> Defekty ({station.defects.length}):
                                        </strong>
                                        {station.defects.map((defect) => (
                                            <Card
                                                key={defect.id}
                                                size="small"
                                                style={{ marginTop: 8, background: '#fff1f0' }}
                                            >
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    <div>
                                                        <Tag color={getSeverityColor(defect.severity)}>
                                                            {defect.severity}
                                                        </Tag>
                                                        <strong>{defect.defectType}</strong>
                                                    </div>
                                                    {defect.description && <p>{defect.description}</p>}
                                                    {defect.imagePath && (
                                                        <Image
                                                            width={200}
                                                            src={defect.imagePath}
                                                            alt="Defect"
                                                            placeholder
                                                        />
                                                    )}
                                                </Space>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </Space>
                        </Card>
                    </Timeline.Item>
                ))}
            </Timeline>
        );
    };

    const expandedRowRender = (record: Product) => {
        return (
            <div style={{ padding: '16px', background: '#fafafa' }}>
                <h4>Detail produktu {record.productId}</h4>
                {renderStationResults(record.stationResults)}
            </div>
        );
    };

    if (loading || !batchDetail) {
        return <div>Načítání...</div>;
    }

    const { recipe } = batchDetail;

    return (
        <div>
            {/* Hlavička s tlačítkem zpět */}
            <Space style={{ marginBottom: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
                    Zpět na Dashboard
                </Button>
            </Space>

            <h1 style={{ marginBottom: 24 }}>Detail dávky #{recipe.id}</h1>

            {/* Statistiky dávky */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="OK produktů"
                            value={batchDetail.okProducts}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="NOK produktů"
                            value={batchDetail.nokProducts}
                            valueStyle={{ color: '#ff4d4f' }}
                            prefix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Úspěšnost"
                            value={recipe.successRate}
                            precision={2}
                            suffix="%"
                            valueStyle={{
                                color: recipe.successRate >= 95 ? '#52c41a' : '#ff4d4f',
                            }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Informace o receptu */}
            <Card title="Informace o výrobní dávce" style={{ marginBottom: 24 }}>
                <Descriptions bordered column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label="ID dávky">
                        <code>{recipe.batchId}</code>
                    </Descriptions.Item>
                    <Descriptions.Item label="Specifikace">
                        {recipe.specification}
                    </Descriptions.Item>
                    <Descriptions.Item label="Začátek výroby">
                        {dayjs(recipe.startTime).format('DD.MM.YYYY HH:mm')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Celkem produktů">
                        {batchDetail.totalProducts}
                    </Descriptions.Item>
                    <Descriptions.Item label="OK kusů">
                        <Tag color="success" icon={<CheckCircleOutlined />}>
                            {recipe.okCount}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="NOK kusů">
                        <Tag color="error" icon={<CloseCircleOutlined />}>
                            {recipe.nokCount}
                        </Tag>
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Tabulka produktů */}
            <Card title={`Produkty (${batchDetail.products?.length || 0})`}>
                <Table
                    columns={productColumns}
                    dataSource={batchDetail.products}
                    rowKey="id"
                    expandable={{
                        expandedRowRender,
                        expandIcon: ({ expanded, onExpand, record }) =>
                            expanded ? (
                                <Button size="small" onClick={(e) => onExpand(record, e)}>
                                    Skrýt detail
                                </Button>
                            ) : (
                                <Button size="small" type="primary" onClick={(e) => onExpand(record, e)}>
                                    Zobrazit detail
                                </Button>
                            ),
                    }}
                    pagination={{
                        pageSize: 20,
                        showTotal: (total) => `Celkem ${total} produktů`,
                    }}
                />
            </Card>
        </div>
    );
};

export default BatchDetail;