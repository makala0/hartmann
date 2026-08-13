import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, message } from 'antd';
import apiClient from '../api/client';
import type { Item } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export const CRITICAL_NOTIFICATIONS_CHANGED_EVENT = 'critical-notifications-changed';

const AUTO_SEND_RETRY_INTERVAL_MS = 5_000;

const CriticalNotificationsBanner: React.FC = () => {
    const { t } = useLanguage();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingNotifications, setPendingNotifications] = useState<Item[]>([]);
    const [sending, setSending] = useState(false);
    const lastAutoSendAttemptRef = useRef(0);

    const fetchPendingNotifications = useCallback(async () => {
        try {
            const response = await apiClient.get<Item[]>('/critical-notifications/pending');
            setPendingNotifications(response.data);
        } catch (error) {
            console.error('Failed to load pending critical notifications:', error);
        }
    }, []);

    const sendPendingCriticalNotifications = useCallback(async (showResultMessage = true) => {
        if (!navigator.onLine) {
            setIsOnline(false);
            return;
        }

        setSending(true);
        try {
            const response = await apiClient.post<Item[]>('/critical-notifications/pending/send');
            const stillPendingNotifications = response.data.filter((notification) => !notification.criticalNotificationSent);
            setPendingNotifications(stillPendingNotifications);

            if (!showResultMessage) {
                return;
            }

            if (stillPendingNotifications.length > 0) {
                message.warning(t('criticalNotifications.stillPending'));
            } else {
                message.success(t('criticalNotifications.sent'));
            }
        } catch (error) {
            console.error('Failed to send pending critical notifications:', error);
            if (showResultMessage) {
                message.error(t('criticalNotifications.sendFailed'));
            }
            await fetchPendingNotifications();
        } finally {
            setSending(false);
        }
    }, [fetchPendingNotifications, t]);

    useEffect(() => {
        if (!isOnline || sending || pendingNotifications.length === 0) {
            return;
        }

        const now = Date.now();
        if (now - lastAutoSendAttemptRef.current < AUTO_SEND_RETRY_INTERVAL_MS) {
            return;
        }

        lastAutoSendAttemptRef.current = now;
        void sendPendingCriticalNotifications(false);
    }, [isOnline, pendingNotifications.length, sendPendingCriticalNotifications, sending]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setIsOnline(navigator.onLine);

            if (navigator.onLine && pendingNotifications.length > 0 && !sending) {
                const now = Date.now();
                if (now - lastAutoSendAttemptRef.current >= AUTO_SEND_RETRY_INTERVAL_MS) {
                    lastAutoSendAttemptRef.current = now;
                    void sendPendingCriticalNotifications(false);
                }
            }
        }, AUTO_SEND_RETRY_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [pendingNotifications.length, sendPendingCriticalNotifications, sending]);

    useEffect(() => {
        fetchPendingNotifications();

        const handleOnline = () => {
            setIsOnline(true);
            void sendPendingCriticalNotifications(false);
        };
        const handleOffline = () => setIsOnline(false);
        const handleNotificationsChanged = () => {
            void fetchPendingNotifications();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener(CRITICAL_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener(CRITICAL_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
        };
    }, [fetchPendingNotifications, sendPendingCriticalNotifications]);

    if (pendingNotifications.length === 0) {
        return null;
    }

    return (
        <Alert
            type="warning"
            showIcon
            message={t('criticalNotifications.title', { count: pendingNotifications.length })}
            description={isOnline ? t('criticalNotifications.onlineDescription') : t('criticalNotifications.offlineDescription')}
            action={(
                <Button
                    danger
                    type="primary"
                    disabled={!isOnline || sending}
                    loading={sending}
                    onClick={() => sendPendingCriticalNotifications(true)}
                >
                    {t('criticalNotifications.sendAll')}
                </Button>
            )}
            style={{ marginBottom: 16 }}
        />
    );
};

export default CriticalNotificationsBanner;
