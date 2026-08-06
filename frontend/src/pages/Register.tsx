import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { t } = useLanguage();

    const onFinish = async (values: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        confirmPassword: string;
    }) => {
        if (values.password !== values.confirmPassword) {
            message.error(t('users.passwordMismatch'));
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/auth/register', {
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                password: values.password,
                confirmPassword: values.confirmPassword,
            });

            message.success(t('register.success'));
            navigate('/login');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('register.failed');
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        >
            <Card
                title={
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '32px', margin: 0 }}>🏭 Hartmann</h1>
                        <p style={{ color: '#888', margin: '8px 0 0 0' }}>{t('register.title')}</p>
                    </div>
                }
                style={{ width: 450, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            >
                <Form name="register" onFinish={onFinish} size="large" layout="vertical">
                    <Form.Item
                        label={t('field.firstName')}
                        name="firstName"
                        rules={[{ required: true, message: t('validation.firstNameRequired') }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder={t('placeholder.firstName')} />
                    </Form.Item>

                    <Form.Item
                        label={t('field.lastName')}
                        name="lastName"
                        rules={[{ required: true, message: t('validation.lastNameRequired') }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder={t('placeholder.lastName')} />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: t('validation.emailRequired') },
                            { type: 'email', message: t('validation.validEmail') },
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="jan.novak@example.com" />
                    </Form.Item>

                    <Form.Item
                        label={t('field.password')}
                        name="password"
                        rules={[
                            { required: true, message: t('login.passwordRequired') },
                            { min: 8, message: t('validation.passwordMin6') },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder={t('placeholder.minPassword')} />
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
                        <Input.Password prefix={<LockOutlined />} placeholder={t('placeholder.repeatPassword')} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            {t('register.submit')}
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Button type="link" onClick={() => navigate('/login')}>{t('login.submit')}</Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default Register;