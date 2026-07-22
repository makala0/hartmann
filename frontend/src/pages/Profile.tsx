import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Descriptions, Divider, Form, Input, message, Select, Space, Switch, Typography } from 'antd';
import { BellOutlined, LockOutlined, MailOutlined, SafetyOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

const { Text } = Typography;

interface UserInfo {
    email: string;
    authorities: string[];
}

interface CriticalNotificationSettings {
    criticalNotificationsEnabled: boolean;
    criticalNotificationEmails: string[];
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Profile: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [form] = Form.useForm();
    const [notificationForm] = Form.useForm<CriticalNotificationSettings>();

    const fetchUserInfo = async () => {
        try {
            const response = await apiClient.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            message.error('Nepodařilo se načíst informace o uživateli');
        }
    };

    const fetchNotificationSettings = useCallback(async () => {
        setNotificationLoading(true);
        try {
            const response = await apiClient.get<CriticalNotificationSettings>('/profile/critical-notifications');
            notificationForm.setFieldsValue(response.data);
        } catch (error) {
            message.error('Nepodařilo se načíst nastavení kritických upozornění');
        } finally {
            setNotificationLoading(false);
        }
    }, [notificationForm]);

    useEffect(() => {
        fetchUserInfo();
        fetchNotificationSettings();
    }, [fetchNotificationSettings]);

    const onNotificationFinish = async (values: CriticalNotificationSettings) => {
        setNotificationLoading(true);
        try {
            const normalizedEmails = (values.criticalNotificationEmails || [])
                .map(email => email.trim().toLowerCase())
                .filter(Boolean);

            const response = await apiClient.put<CriticalNotificationSettings>('/profile/critical-notifications', {
                criticalNotificationsEnabled: values.criticalNotificationsEnabled,
                criticalNotificationEmails: Array.from(new Set(normalizedEmails)),
            });
            notificationForm.setFieldsValue(response.data);
            message.success('Nastavení e-mailových upozornění bylo uloženo');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Nastavení e-mailových upozornění se nepodařilo uložit';
            message.error(errorMessage);
        } finally {
            setNotificationLoading(false);
        }
    };

    const onFinish = async (values: {
        currentPassword: string;
        newPassword: string;
        confirmNewPassword: string;
    }) => {
        if (values.newPassword !== values.confirmNewPassword) {
            message.error('Nová hesla se neshodují!');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/auth/change-password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                confirmNewPassword: values.confirmNewPassword,
            });

            message.success('Heslo bylo úspěšně změněno!');
            form.resetFields();
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Změna hesla selhala';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 style={{ marginBottom: 24 }}>
                <UserOutlined /> Můj profil
            </h1>

            {/* Informace o uživateli */}
            <Card
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar size={48} icon={<UserOutlined />} />
                        <span>Informace o účtu</span>
                    </div>
                }
                style={{ marginBottom: 24 }}
            >
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="Email">
                        <strong>{user?.email || 'Načítání...'}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Role">
                        {user?.authorities?.join(', ') || 'Uživatel'}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <Card
                title={
                    <Space>
                        <BellOutlined />
                        <span>Upozornění na kritické kusy</span>
                    </Space>
                }
                style={{ marginBottom: 24 }}
            >
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                    message="E-mail se odešle okamžitě po zaškrtnutí Critical u kusu."
                    description="Adresáty můžeš spravovat jako seznam. Pokud je odesílání vypnuté nebo není vyplněný žádný e-mail, upozornění se neposílá."
                />
                <Form<CriticalNotificationSettings>
                    form={notificationForm}
                    layout="vertical"
                    onFinish={onNotificationFinish}
                    initialValues={{ criticalNotificationsEnabled: false, criticalNotificationEmails: [] }}
                    style={{ maxWidth: 720 }}
                >
                    <Form.Item name="criticalNotificationsEnabled" valuePropName="checked">
                        <Switch
                            checkedChildren="Odesílání zapnuto"
                            unCheckedChildren="Odesílání vypnuto"
                        />
                    </Form.Item>

                    <Form.Item
                        label="E-mailové adresy supportu"
                        name="criticalNotificationEmails"
                        extra="Napiš e-mail a potvrď Enterem. Adresy lze odstranit křížkem přímo v seznamu."
                        rules={[
                            {
                                validator: (_, value: string[] = []) => {
                                    const invalidEmail = value.find(email => !emailRegex.test(email.trim()));
                                    if (invalidEmail) {
                                        return Promise.reject(new Error(`Neplatná e-mailová adresa: ${invalidEmail}`));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Select
                            mode="tags"
                            size="large"
                            tokenSeparators={[',', ';', ' ']}
                            placeholder="support@example.com"
                            suffixIcon={<MailOutlined />}
                            open={false}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Space align="center">
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={notificationLoading}>
                            Uložit upozornění
                        </Button>
                        <Text type="secondary">Nastavení platí pro tvůj uživatelský účet.</Text>
                    </Space>
                </Form>
            </Card>

            {/* Změna hesla */}
            <Card
                title={
                    <span>
            <SafetyOutlined /> Změna hesla
          </span>
                }
            >
                <Form
                    form={form}
                    name="change-password"
                    onFinish={onFinish}
                    layout="vertical"
                    style={{ maxWidth: 500 }}
                >
                    <Form.Item
                        label="Současné heslo"
                        name="currentPassword"
                        rules={[{ required: true, message: 'Zadejte současné heslo!' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Vaše současné heslo"
                            size="large"
                        />
                    </Form.Item>

                    <Divider />

                    <Form.Item
                        label="Nové heslo"
                        name="newPassword"
                        rules={[
                            { required: true, message: 'Zadejte nové heslo!' },
                            { min: 8, message: 'Heslo musí mít alespoň 6 znaků!' },
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Minimálně 6 znaků"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Potvrzení nového hesla"
                        name="confirmNewPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Potvrďte nové heslo!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Nová hesla se neshodují!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Zadejte nové heslo znovu"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" size="large" loading={loading}>
                            Změnit heslo
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Profile;
