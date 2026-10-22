import React from 'react';
import { Button, Modal, Tag } from 'antd';
import type { Item } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const ItemPrioritySummary: React.FC<{ priority: Item['priority'] }> = ({ priority }) => {
    const { t } = useLanguage();
    if (!priority) return <span>—</span>;
    if (priority.status !== 'COMPLETE') return <Tag color="warning">{t('priority.incomplete')}</Tag>;
    if (priority.result === 'OK') return <Tag color="success">OK</Tag>;
    const explanation = `${t('priority.unspecified')} ST${priority.station} — ${priority.result}. ${t('priority.codeVersion')}: ${priority.codeVersion}`;
    return <Button type="text" size="small" title={explanation}
        onClick={() => Modal.info({ title: t('priority.title'), content: explanation })}>
        <Tag color={priority.result === 'NOK' ? 'error' : 'warning'}>
            {priority.result} · ST{priority.station} · {priority.code}
        </Tag>
    </Button>;
};

export default ItemPrioritySummary;
