import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import type { AppUser, CriticalNotificationSettings } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

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
    const [notificationForm] = Form.useForm<CriticalNotificationSettings>();
    const { t } = useLanguage();

    const roleOptions = [
        { value: 'ROLE_WORKER', label: t('role.worker') },
        { value: 'ROLE_ADMIN', label: t('role.admin') },
        { value: 'ROLE_SERVICE', label: t('role.service') },
    ];

    const roleLabels: Record<string, string> = {
        ROLE_ADMIN: t('role.admin'),
        ROLE_WORKER: t('role.worker'),
        ROLE_SERVICE: t('role.service'),
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/users');
            setUsers(response.data);
            notificationForm.setFieldsValue({
                criticalNotificationsEnabled: response.data.some((user: AppUser) => user.criticalNotificationRecipient),
                criticalNotificationEmails: response.data
                    .filter((user: AppUser) => user.criticalNotificationRecipient)
                    .map((user: AppUser) => user.email),
            });
        } catch (error: any) {
            message.error(error.response?.data?.error || t('users.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [notificationForm, t]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const createUser = async (values: { email: string; password: string; confirmPassword: string; role: string }) => {
        if (values.password !== values.confirmPassword) {
            message.error(t('users.passwordMismatch'));
            return;
        }

        setSaving(true);
        try {
            await apiClient.post('/auth/register', values);
            message.success(t('users.created'));
            setModalOpen(false);
            form.resetFields();
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || t('users.createFailed'));
        } finally {
            setSaving(false);
        }
    };


    const saveCriticalNotificationSettings = async (values: CriticalNotificationSettings) => {
        setSaving(true);
        try {
            const selectedEmails = values.criticalNotificationEmails || [];
            await apiClient.put('/critical-notifications', {
                criticalNotificationsEnabled: selectedEmails.length > 0,
                criticalNotificationEmails: selectedEmails,
            });
            message.success(t('users.recipientsSaved'));
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || t('users.recipientsSaveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (id: number) => {
        try {
            await apiClient.delete(`/users/${id}`);
            message.success(t('users.deleted'));
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || t('users.deleteFailed'));
        }
    };

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
            title={t('users.management')}
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                    {t('users.addUser')}
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
                        title: t('field.role'),
                        dataIndex: 'role',
                        render: (role: string) => <Tag color={roleColors[role]}>{roleLabels[role] || role}</Tag>,
                    },
                    {
                        title: t('common.actions'),
                        key: 'actions',
                        render: (_, record) => (
                            <Popconfirm
                                title={t('users.deleteUserQuestion')}
                                description={t('users.deleteUserDescription', { email: record.email })}
                                okText={t('common.delete')}
                                cancelText={t('common.cancel')}
                                okButtonProps={{ danger: true }}
                                onConfirm={() => deleteUser(record.id)}
                            >
                                <Button danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
                            </Popconfirm>
                        ),
                    },
                ]}
            />

            <Card title={t('users.criticalRecipients')} style={{ marginTop: 24 }}>
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                    message={t('users.criticalAlertMessage')}
                    description={t('users.criticalAlertDescription')}
                />
                <Form<CriticalNotificationSettings>
                    form={notificationForm}
                    layout="vertical"
                    onFinish={saveCriticalNotificationSettings}
                    initialValues={{ criticalNotificationsEnabled: false, criticalNotificationEmails: [] }}
                >
                    <Form.Item
                        label={t('field.emailRecipients')}
                        name="criticalNotificationEmails"
                        extra={t('users.emailRecipientsExtra')}
                    >
                        <Select
                            mode="multiple"
                            allowClear
                            placeholder={t('placeholder.selectRegisteredAccounts')}
                            options={users.map(user => ({ value: user.email, label: user.email }))}
                        />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={saving}>{t('users.saveRecipients')}</Button>
                </Form>
            </Card>

            <Modal
                title={t('users.addUser')}
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
                            { required: true, message: t('validation.emailRequired') },
                            { type: 'email', message: t('validation.validEmail') },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('field.role')} name="role" rules={[{ required: true, message: t('validation.roleRequired') }]}>
                        <Select options={roleOptions} />
                    </Form.Item>
                    <Form.Item
                        label={t('field.password')}
                        name="password"
                        rules={[
                            { required: true, message: t('login.passwordRequired') },
                            { min: 8, message: t('validation.passwordMin8') },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        label={t('field.confirmPassword')}
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: t('validation.confirmPassword') },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(t('users.passwordMismatch')));
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="primary" htmlType="submit" loading={saving}>{t('common.create')}</Button>
                    </Space>
                </Form>
            </Modal>
        </Card>
        </Space>
    );
};

export default Users;
