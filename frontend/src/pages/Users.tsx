import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import type { AppUser } from '../types';

const ROLE_OPTIONS = [
    { value: 'ROLE_WORKER', label: 'Pracovník' },
    { value: 'ROLE_ADMIN', label: 'Admin' },
    { value: 'ROLE_SERVICE', label: 'Servis' },
];

const roleLabels: Record<string, string> = {
    ROLE_ADMIN: 'Admin',
    ROLE_WORKER: 'Pracovník',
    ROLE_SERVICE: 'Servis',
};

const roleColors: Record<string, string> = {
    ROLE_ADMIN: 'red',
    ROLE_WORKER: 'blue',
    ROLE_SERVICE: 'purple',
};

const Users: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/users');
            setUsers(response.data);
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Nepodařilo se načíst uživatele');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const createUser = async (values: { email: string; password: string; confirmPassword: string; role: string }) => {
        if (values.password !== values.confirmPassword) {
            message.error('Hesla se neshodují!');
            return;
        }

        setSaving(true);
        try {
            await apiClient.post('/auth/register', values);
            message.success('Uživatel byl vytvořen');
            setModalOpen(false);
            form.resetFields();
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Vytvoření uživatele selhalo');
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (id: number) => {
        try {
            await apiClient.delete(`/users/${id}`);
            message.success('Uživatel byl odebrán');
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Odebrání uživatele selhalo');
        }
    };

    return (
        <Card
            title="Správa uživatelů"
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                    Přidat uživatele
                </Button>
            }
        >
            <Table
                rowKey="id"
                loading={loading}
                dataSource={users}
                columns={[
                    {
                        title: 'E-mail',
                        dataIndex: 'email',
                    },
                    {
                        title: 'Role',
                        dataIndex: 'role',
                        render: (role: string) => <Tag color={roleColors[role]}>{roleLabels[role] || role}</Tag>,
                    },
                    {
                        title: 'Akce',
                        key: 'actions',
                        render: (_, record) => (
                            <Popconfirm
                                title="Odebrat uživatele?"
                                description={`Opravdu chcete odebrat účet ${record.email}?`}
                                okText="Odebrat"
                                cancelText="Zrušit"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => deleteUser(record.id)}
                            >
                                <Button danger icon={<DeleteOutlined />}>Odebrat</Button>
                            </Popconfirm>
                        ),
                    },
                ]}
            />

            <Modal
                title="Přidat uživatele"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={createUser} initialValues={{ role: 'ROLE_WORKER' }}>
                    <Form.Item
                        label="E-mail"
                        name="email"
                        rules={[
                            { required: true, message: 'Zadejte e-mail!' },
                            { type: 'email', message: 'Zadejte platný e-mail!' },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Vyberte roli!' }]}>
                        <Select options={ROLE_OPTIONS} />
                    </Form.Item>
                    <Form.Item
                        label="Heslo"
                        name="password"
                        rules={[
                            { required: true, message: 'Zadejte heslo!' },
                            { min: 8, message: 'Heslo musí mít alespoň 8 znaků!' },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        label="Potvrzení hesla"
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Potvrďte heslo!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Hesla se neshodují!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setModalOpen(false)}>Zrušit</Button>
                        <Button type="primary" htmlType="submit" loading={saving}>Vytvořit</Button>
                    </Space>
                </Form>
            </Modal>
        </Card>
    );
};

export default Users;
