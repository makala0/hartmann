import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('username', values.username);
            formData.append('password', values.password);

            await apiClient.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            message.success('Přihlášení úspěšné!');
            navigate('/dashboard');
        } catch (error) {
            message.error('Nesprávné přihlašovací údaje');
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
                        rules={[{ required: true, message: 'Zadejte uživatelské jméno!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Zadejte heslo!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Heslo" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            Přihlásit se
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <a onClick={() => navigate('/register')}>Zaregistrovat nový účet</a>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default Login;