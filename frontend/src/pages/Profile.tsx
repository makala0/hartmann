import React, { useCallback, useEffect, useState } from 'react';
import { Avatar, Button, Card, Descriptions, Divider, Form, Input, message } from 'antd';
import { LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';


interface UserInfo {
    email: string;
    authorities: string[];
}

const Profile: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [form] = Form.useForm();
    const { t } = useLanguage();

    const fetchUserInfo = useCallback(async () => {
        try {
            const response = await apiClient.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            message.error(t('profile.loadFailed'));
        }
    }, [t]);


    useEffect(() => {
        fetchUserInfo();
    }, [fetchUserInfo]);


    const onFinish = async (values: {
        currentPassword: string;
        newPassword: string;
        confirmNewPassword: string;
    }) => {
        if (values.newPassword !== values.confirmNewPassword) {
            message.error(t('profile.passwordMismatch'));
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/auth/change-password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                confirmNewPassword: values.confirmNewPassword,
            });

            message.success(t('profile.passwordChanged'));
            form.resetFields();
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('profile.passwordChangeFailed');
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 style={{ marginBottom: 24 }}>
                <UserOutlined /> {t('profile.title')}
            </h1>

            {/* Informace o uživateli */}
            <Card
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar size={48} icon={<UserOutlined />} />
                        <span>{t('profile.accountInfo')}</span>
                    </div>
                }
                style={{ marginBottom: 24 }}
            >
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="Email">
                        <strong>{user?.email || t('common.loading')}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('field.role')}>
                        {user?.authorities?.join(', ') || t('profile.user')}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* {t('profile.changePassword')} */}
            <Card
                title={
                    <span>
            <SafetyOutlined /> {t('profile.changePassword')}
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
                        label={t('field.currentPassword')}
                        name="currentPassword"
                        rules={[{ required: true, message: t('validation.currentPasswordRequired') }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder={t('placeholder.currentPassword')}
                            size="large"
                        />
                    </Form.Item>

                    <Divider />

                    <Form.Item
                        label={t('field.newPassword')}
                        name="newPassword"
                        rules={[
                            { required: true, message: t('validation.newPasswordRequired') },
                            { min: 8, message: t('validation.passwordMin6') },
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder={t('placeholder.minPassword')}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label={t('field.confirmNewPassword')}
                        name="confirmNewPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: t('validation.confirmNewPassword') },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(t('profile.passwordMismatch')));
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder={t('placeholder.repeatNewPassword')}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" size="large" loading={loading}>
                            {t('profile.changePasswordButton')}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Profile;
