import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Table, message } from 'antd';
import apiClient from '../api/client';
import type { DefectRule } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const DefectCatalog: React.FC = () => {
    const { t } = useLanguage();
    const [rows, setRows] = useState<DefectRule[]>([]);
    const [history, setHistory] = useState<DefectRule[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [editing, setEditing] = useState<DefectRule | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [indexing, setIndexing] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try { setRows((await apiClient.get<DefectRule[]>('/defect-catalog')).data); }
        catch { message.error(t('catalog.loadFailed')); }
        finally { setLoading(false); }
    }, [t]);
    useEffect(() => { void load(); }, [load]);

    const edit = (rule: DefectRule | null) => {
        setEditing(rule);
        form.resetFields();
        form.setFieldsValue(rule || { station: 1, enabled: true });
        setOpen(true);
    };
    const save = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            await apiClient.post('/defect-catalog', { ...values, previousRuleId: editing?.id || null });
            setOpen(false); message.success(t('catalog.saved')); await load();
        } catch (error: any) {
            message.error(t(error.response?.status === 409 ? 'catalog.conflict' : 'catalog.saveFailed'));
        } finally { setSaving(false); }
    };

    const columns = [
        { title: t('catalog.station'), dataIndex: 'station', render: (station: number) => `ST${station}` },
        { title: t('catalog.cameraType'), dataIndex: 'cameraType' },
        { title: t('catalog.code'), dataIndex: 'code' },
        { title: t('catalog.descriptionCs'), dataIndex: 'descriptionCs' },
        { title: t('catalog.priority'), dataIndex: 'priority', render: (value: number | null) => value ?? '—' },
        { title: t('catalog.revision'), dataIndex: 'revision' },
        { title: t('catalog.enabled'), dataIndex: 'enabled', render: (enabled: boolean) => t(enabled ? 'common.yes' : 'common.no') },
        { title: t('common.actions'), key: 'actions', render: (_: unknown, rule: DefectRule) => <Button onClick={() => edit(rule)}>{t('catalog.newRevision')}</Button> },
    ];

    return <Card title={t('catalog.title')}>
        <Alert type="info" showIcon message={t('catalog.help')} style={{ marginBottom: 16 }} />
        <Space style={{ marginBottom: 16 }}>
            <Button type="primary" onClick={() => edit(null)}>{t('catalog.add')}</Button>
            <Button loading={indexing} onClick={async () => {
                setIndexing(true);
                try { await apiClient.post('/defect-catalog/reindex'); message.success(t('catalog.indexed')); }
                catch { message.error(t('catalog.indexFailed')); }
                finally { setIndexing(false); }
            }}>{t('catalog.index')}</Button>
            <Button onClick={async () => {
                try { setHistory((await apiClient.get<DefectRule[]>('/defect-catalog/history')).data); setHistoryOpen(true); }
                catch { message.error(t('catalog.loadFailed')); }
            }}>{t('catalog.history')}</Button>
        </Space>
        <Table rowKey="id" dataSource={rows} columns={columns} loading={loading} scroll={{ x: 1100 }} />
        <Modal title={t(editing ? 'catalog.newRevision' : 'catalog.add')} open={open} onCancel={() => !saving && setOpen(false)}
            onOk={() => form.submit()} confirmLoading={saving} destroyOnHidden>
            <Form form={form} layout="vertical" onFinish={save} disabled={saving}>
                <Form.Item name="station" label={t('catalog.station')} rules={[{ required: true }]}>
                    <Select disabled={Boolean(editing)} options={[1, 2, 3].map(value => ({ value, label: `ST${value}` }))} />
                </Form.Item>
                <Form.Item name="cameraType" label={t('catalog.cameraType')} rules={[{ required: true, whitespace: true }]}>
                    <Input maxLength={200} disabled={Boolean(editing)} />
                </Form.Item>
                <Form.Item name="code" label={t('catalog.code')} rules={[{ required: true, whitespace: true }]}><Input maxLength={50} /></Form.Item>
                <Form.Item name="descriptionCs" label={t('catalog.descriptionCs')} rules={[{ required: true, whitespace: true }]}><Input maxLength={1000} /></Form.Item>
                <Form.Item name="descriptionEn" label={t('catalog.descriptionEn')}><Input maxLength={1000} /></Form.Item>
                <Form.Item name="priority" label={t('catalog.priority')} extra={t('catalog.priorityHelp')}><InputNumber min={0} precision={0} /></Form.Item>
                <Form.Item name="enabled" valuePropName="checked"><Checkbox>{t('catalog.enabled')}</Checkbox></Form.Item>
            </Form>
        </Modal>
        <Modal title={t('catalog.history')} open={historyOpen} onCancel={() => setHistoryOpen(false)} footer={null} width="95vw">
            <Table rowKey="id" dataSource={history} columns={columns.filter(column => column.key !== 'actions')} scroll={{ x: 1100 }} />
        </Modal>
    </Card>;
};

export default DefectCatalog;
