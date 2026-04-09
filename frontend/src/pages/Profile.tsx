import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Divider, Avatar } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

interface UserInfo {
    email: string;
    authorities: string[];
}

const Profile: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            const response = await apiClient.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            message.error('Nepodařilo se načíst informace o uživateli');
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
                            { min: 6, message: 'Heslo musí mít alespoň 6 znaků!' },
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