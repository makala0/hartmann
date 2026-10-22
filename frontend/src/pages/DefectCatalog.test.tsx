import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import apiClient from '../api/client';
import DefectCatalog from './DefectCatalog';

const mockT = (key: string) => key;
let mockValues: any = {};
let mockFinish: any;
const mockForm = {
    resetFields: () => { mockValues = {}; },
    setFieldsValue: (values: any) => { mockValues = { ...values }; },
    submit: () => mockFinish(mockValues),
};
jest.mock('../api/client');
jest.mock('../i18n/LanguageContext', () => ({ useLanguage: () => ({ t: mockT }) }));
jest.mock('antd', () => {
    const Box = ({ children }: any) => <div>{children}</div>;
    const Form = Object.assign(({ children, onFinish }: any) => { mockFinish = onFinish; return <div>{children}</div>; }, {
        useForm: () => [mockForm], Item: Box,
    });
    return {
        Form, Card: Box, Space: Box, Tag: Box,
        Alert: ({ message }: any) => <div>{message}</div>,
        Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
        Modal: ({ children, open, onOk }: any) => open ? <div role="dialog">{children}{onOk && <button onClick={onOk}>Save</button>}</div> : null,
        Input: () => null, InputNumber: () => null, Checkbox: Box, Select: () => null,
        Table: ({ dataSource, columns }: any) => <div>{dataSource.map((row: any) => <div key={row.id}>
            {row.code}{columns.find((c: any) => c.key === 'actions')?.render(null, row)}
        </div>)}</div>,
        message: { error: jest.fn(), success: jest.fn() },
    };
});

const rule = { id: 1, station: 3, cameraType: 'chybějící svár', code: '3.1.1', revision: 1,
    descriptionCs: 'Chybějící svár', enabled: true };
beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [rule] });
});

test('editing sends a new revision with the previous revision id', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { ...rule, id: 2, revision: 2 } });
    render(<DefectCatalog />);
    await screen.findByText('3.1.1');
    fireEvent.click(screen.getByText('catalog.newRevision'));
    mockValues.code = 'CUSTOM';
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/defect-catalog', expect.objectContaining({
        code: 'CUSTOM', previousRuleId: 1, station: 3, cameraType: 'chybějící svár',
    })));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('conflicting edits keep the form open and explain the conflict', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue({ response: { status: 409 } });
    render(<DefectCatalog />);
    await screen.findByText('3.1.1');
    fireEvent.click(screen.getByText('catalog.newRevision'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('catalog.conflict'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});
