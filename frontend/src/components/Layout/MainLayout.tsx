import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Select } from 'antd';
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
import { useLanguage } from '../../i18n/LanguageContext';
import CriticalNotificationsBanner from '../CriticalNotificationsBanner';

const { Header, Content, Footer } = Layout;

interface MainLayoutProps {
    children: React.ReactNode;
    user?: User;
    onLogout?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language, setLanguage, t } = useLanguage();

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
            label: t('common.profile'),
            onClick: () => navigate('/profile'),
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: t('common.logout'),
            danger: true,
            onClick: handleLogout,
        },
    ];

    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: <Link to="/dashboard">{t('nav.orders')}</Link>,
        },
        {
            key: '/items',
            icon: <DatabaseOutlined />,
            label: <Link to="/items">{t('nav.items')}</Link>,
        },
        {
            key: '/inspection',
            icon: <BarcodeOutlined />,
            label: <Link to="/inspection">{t('nav.inspectionMode')}</Link>,
        },
        ...(canManageUsers ? [{
            key: '/users',
            icon: <UserOutlined />,
            label: <Link to="/users">{t('nav.users')}</Link>,
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar icon={<UserOutlined />} />
                        <span>{user?.email}</span>
                    </div>
                    </Dropdown>
                </div>
            </Header>

            <Content style={{ padding: '24px 50px' }}>
                <CriticalNotificationsBanner />
                {children}
            </Content>

            <Footer style={{ textAlign: 'center', background: '#fff' }}>
                © 2026 Hartmann Production System
            </Footer>
        </Layout>
    );
};

export default MainLayout;