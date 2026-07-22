import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import csCS from 'antd/locale/cs_CZ';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import OrderDetail from './pages/OrderDetail';
import InspectionMode from './pages/InspectionMode';
import ItemsPage from './pages/ItemsPage';
import MainLayout from './components/Layout/MainLayout';
import apiClient from './api/client';
import type { User } from './types';
import Users from "./pages/Users";

const PrivateRoute: React.FC<{ children: React.ReactNode; user: User | null }> = ({
                                                                                      children,
                                                                                      user
                                                                                  }) => {
    return user ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await apiClient.get('/auth/me');
                setUser(response.data);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    if (loading) return <div>Načítání...</div>;

    return (
        <ConfigProvider locale={csCS}>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/login"
                        element={<Login onLogin={async () => {
                            const response = await apiClient.get('/auth/me');
                            setUser(response.data);
                        }} />}
                    />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute user={user}>
                                <MainLayout user={user || undefined} onLogout={() => setUser(null)}>
                                    <Dashboard />
                                </MainLayout>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/dashboard/:id"
                        element={
                            <PrivateRoute user={user}>
                                <MainLayout user={user || undefined} onLogout={() => setUser(null)}>
                                    <OrderDetail />
                                </MainLayout>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/items"
                        element={
                            <PrivateRoute user={user}>
                                <MainLayout user={user || undefined} onLogout={() => setUser(null)}>
                                    <ItemsPage />
                                </MainLayout>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/inspection"
                        element={
                            <PrivateRoute user={user}>
                                <MainLayout user={user || undefined} onLogout={() => setUser(null)}>
                                    <InspectionMode />
                                </MainLayout>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <PrivateRoute user={user}>
                                <MainLayout user={user || undefined} onLogout={() => setUser(null)}>
                                    <Users />
                                </MainLayout>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <PrivateRoute user={user}>
                                <MainLayout user={user || undefined} onLogout={() => setUser(null)}>
                                    <Profile />
                                </MainLayout>
                            </PrivateRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
            </BrowserRouter>
        </ConfigProvider>
    );
};

export default App;