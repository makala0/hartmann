import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        confirmPassword: string;
    }) => {
        if (values.password !== values.confirmPassword) {
            message.error('Hesla se neshodují!');
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

            message.success('Registrace proběhla úspěšně! Nyní se můžete přihlásit.');
            navigate('/login');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Registrace selhala';
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
                        <p style={{ color: '#888', margin: '8px 0 0 0' }}>Registrace nového uživatele</p>
                    </div>
                }
                style={{ width: 450, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            >
                <Form name="register" onFinish={onFinish} size="large" layout="vertical">
                    <Form.Item
                        label="Křestní jméno"
                        name="firstName"
                        rules={[{ required: true, message: 'Zadejte křestní jméno!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Jan" />
                    </Form.Item>

                    <Form.Item
                        label="Příjmení"
                        name="lastName"
                        rules={[{ required: true, message: 'Zadejte příjmení!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Novák" />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Zadejte email!' },
                            { type: 'email', message: 'Zadejte platný email!' },
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="jan.novak@example.com" />
                    </Form.Item>

                    <Form.Item
                        label="Heslo"
                        name="password"
                        rules={[
                            { required: true, message: 'Zadejte heslo!' },
                            { min: 6, message: 'Heslo musí mít alespoň 6 znaků!' },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Minimálně 6 znaků" />
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
                        <Input.Password prefix={<LockOutlined />} placeholder="Zadejte heslo znovu" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            Zaregistrovat se
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <a onClick={() => navigate('/login')}>Přihlásit se</a>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default Register;