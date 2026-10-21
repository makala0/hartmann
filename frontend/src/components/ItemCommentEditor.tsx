import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Input, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import type { Item } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
    item: Item;
    onItemChange?: (item: Item) => void;
}

// Mount with key={item.id} so drafts and pending saves stay with their item.
const ItemCommentEditor: React.FC<Props> = ({ item, onItemChange }) => {
    const [comment, setComment] = useState(item.comment || '');
    const [saving, setSaving] = useState(false);
    const mounted = useRef(false);
    const { t } = useLanguage();

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => { setComment(item.comment || ''); }, [item.comment]);

    const save = async () => {
        setSaving(true);
        try {
            const response = await apiClient.put<Item>(`/dashboard/item/${item.id}/comment`, { comment });
            if (!mounted.current) return;
            setComment(response.data.comment || '');
            onItemChange?.(response.data);
            message.success(t('itemDetail.commentSaved'));
        } catch {
            if (mounted.current) message.error(t('itemDetail.commentSaveFailed'));
        } finally {
            if (mounted.current) setSaving(false);
        }
    };

    return (
        <Card title={t('itemDetail.commentTitle')} size="small" style={{ marginTop: 16 }}>
            <Input.TextArea
                aria-label={t('itemDetail.commentTitle')}
                placeholder={t('itemDetail.commentPlaceholder')}
                value={comment}
                onChange={event => setComment(event.target.value)}
                autoSize={{ minRows: 3, maxRows: 6 }}
                maxLength={4000}
                showCount
                disabled={saving}
            />
            <div style={{ textAlign: 'right', marginTop: 12 }}>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
                    {t('itemDetail.saveComment')}
                </Button>
            </div>
        </Card>
    );
};

export default ItemCommentEditor;
