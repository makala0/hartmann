import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Select } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

interface LoginProps {
    onLogin?: () => Promise<void> | void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { language, setLanguage, t } = useLanguage();

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('username', values.username);
            formData.append('password', values.password);

            await apiClient.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            await onLogin?.();
            message.success(t('login.success'));
            navigate('/dashboard');
        } catch (error) {
            message.error(t('login.invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div style={{ position: 'absolute', top: 24, right: 24 }}>
                <Select
                    aria-label={t('common.language')}
                    value={language}
                    style={{ width: 88 }}
                    options={[
                        { value: 'cs', label: 'CZ' },
                        { value: 'en', label: 'EN' },
                    ]}
                    onChange={setLanguage}
                />
            </div>
            <Card
                title={
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '32px', margin: 0 }}>🏭 Hartmann</h1>
                        <p style={{ color: '#888', margin: '8px 0 0 0' }}>Production System</p>
                    </div>
                }
                style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            >
                <Form name="login" onFinish={onFinish} size="large">
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: t('login.usernameRequired') }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: t('login.passwordRequired') }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder={t('field.password')} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            {t('login.submit')}
                        </Button>
                    </Form.Item>

                    {/*<div style={{ textAlign: 'center' }}>*/}
                    {/*    <a onClick={() => navigate('/register')}>Zaregistrovat nový účet</a>*/}
                    {/*</div>*/}
                </Form>
            </Card>
        </div>
    );
};

export default Login;