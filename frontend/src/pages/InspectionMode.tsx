import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Spin, Typography, message } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import type { Item } from '../types';
import ItemDetailContent from '../components/ItemDetailContent';

const { Title, Text } = Typography;

const SCAN_IDLE_DELAY_MS = 250;

const InspectionMode: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const scanBufferRef = useRef('');
    const scanTimeoutRef = useRef<number | null>(null);
    const loadingRef = useRef(false);

    const clearScanTimeout = () => {
        if (scanTimeoutRef.current) {
            window.clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
        }
    };

    const submitScan = useCallback(async (code: string) => {
        const normalizedCode = code.trim();
        scanBufferRef.current = '';
        clearScanTimeout();

        if (!normalizedCode || loadingRef.current) {
            return;
        }

        if (!/^\d+$/.test(normalizedCode)) {
            message.error(`Neplatný kód: ${normalizedCode}`);
            return;
        }

        loadingRef.current = true;
        setLoading(true);

        try {
            const response = await apiClient.get<{ orderId: number; item: Item }>(`/dashboard/scan/${normalizedCode}`);
            setSelectedItem(response.data.item);
            message.success(`Načten kus ${response.data.item.itemId}`);
        } catch (error) {
            console.error('Failed to load scanned item:', error);
            message.error(`Kód ${normalizedCode} nebyl nalezen`);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const scheduleAutomaticSubmit = () => {
            clearScanTimeout();
            scanTimeoutRef.current = window.setTimeout(() => {
                submitScan(scanBufferRef.current);
            }, SCAN_IDLE_DELAY_MS);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                submitScan(scanBufferRef.current);
                return;
            }

            if (event.key === 'Backspace') {
                scanBufferRef.current = scanBufferRef.current.slice(0, -1);
                scheduleAutomaticSubmit();
                return;
            }

            if (event.key.length === 1) {
                scanBufferRef.current += event.key;
                scheduleAutomaticSubmit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearScanTimeout();
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [submitScan]);

    return (
        <div style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto' }}>
            {selectedItem ? (
                <ItemDetailContent
                    item={selectedItem}
                    onItemChange={setSelectedItem}
                />
            ) : (
                <Card style={{ textAlign: 'center', padding: '110px 48px' }}>
                    <BarcodeOutlined style={{ fontSize: 64, color: '#1677ff' }} />
                    <Title level={3}>Čekám na první kód</Title>
                    <Text type="secondary">Po načtení kódu se zde zobrazí detail kusu.</Text>
                    {loading && <div style={{ marginTop: 24 }}><Spin /></div>}
                </Card>
            )}
        </div>
    );
};

export default InspectionMode;
