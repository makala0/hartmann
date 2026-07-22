import React from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
    DashboardOutlined,
    BarcodeOutlined,
    DatabaseOutlined,
    UserOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import type { User } from '../../types';
import apiClient from '../../api/client';

const { Header, Content, Footer } = Layout;

interface MainLayoutProps {
    children: React.ReactNode;
    user?: User;
    onLogout?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await apiClient.post('/auth/logout');
            onLogout?.();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const canManageUsers = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_SERVICE';

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profil',
            onClick: () => navigate('/profile'),
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Odhlásit se',
            danger: true,
            onClick: handleLogout,
        },
    ];

    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: <Link to="/dashboard">Zakázky</Link>,
        },
        {
            key: '/items',
            icon: <DatabaseOutlined />,
            label: <Link to="/items">Kusy</Link>,
        },
        {
            key: '/inspection',
            icon: <BarcodeOutlined />,
            label: <Link to="/inspection">Režim kontroly</Link>,
        },
        ...(canManageUsers ? [{
            key: '/users',
            icon: <UserOutlined />,
            label: <Link to="/users">Uživatelé</Link>,
        }] : []),
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#1890ff',
                        marginRight: '40px'
                    }}>
                        🏭Hartmann
                    </div>
                    <Menu
                        mode="horizontal"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        style={{ flex: 1, border: 'none', minWidth: 260 }}
                    />
                </div>

                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar icon={<UserOutlined />} />
                        <span>{user?.email}</span>
                    </div>
                </Dropdown>
            </Header>

            <Content style={{ padding: '24px 50px' }}>
                {children}
            </Content>

            <Footer style={{ textAlign: 'center', background: '#fff' }}>
                © 2026 Hartmann Production System
            </Footer>
        </Layout>
    );
};

export default MainLayout;