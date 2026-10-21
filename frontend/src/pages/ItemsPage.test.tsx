import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ItemsPage from './ItemsPage';
import apiClient from '../api/client';

jest.mock('../api/client');
jest.mock('../components/ItemDetailContent', () => () => null);
jest.mock('../i18n/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
jest.mock('antd', () => {
    const Box = ({ children }: any) => <div>{children}</div>;
    return {
        Card: Box, Col: Box, Row: Box, Space: Box, Tag: Box, Drawer: () => null,
        Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
        Input: ({ id, value, onChange }: any) => <input id={id} value={value || ''} onChange={onChange} />,
        InputNumber: ({ placeholder, value, onChange }: any) => (
            <input aria-label={placeholder} value={value || ''} onChange={e => onChange(Number(e.target.value))} />
        ),
        Select: ({ id, value, options, onChange }: any) => (
            <select id={id} value={value ?? ''} onChange={e => onChange(options.find((o: any) => String(o.value) === e.target.value)?.value)}>
                <option value="">All</option>
                {options.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        ),
        Checkbox: ({ children, checked, onChange }: any) => <label><input type="checkbox" checked={checked} onChange={onChange} />{children}</label>,
        Table: ({ pagination }: any) => <div>
            <span data-testid="page">{pagination.current}</span>
            <button onClick={() => pagination.onChange(2, 10)}>Next page</button>
            <button onClick={() => pagination.onChange(2, 20)}>Resize page</button>
        </div>,
    };
});

test('applies all drafted filters together and retains them across pages until reset', async () => {
    (apiClient.get as jest.Mock).mockImplementation((url, { params }) => Promise.resolve({ data: {
        content: [], totalElements: 25, currentPage: params.page, size: params.size,
    } }));
    render(<ItemsPage />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Next page'));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    const count = (apiClient.get as jest.Mock).mock.calls.length;
    fireEvent.change(screen.getByLabelText('field.result:'), { target: { value: 'NOK' } });
    fireEvent.change(screen.getByLabelText('field.camera:'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('field.itemId:'), { target: { value: 'kus' } });
    fireEvent.change(screen.getByLabelText('field.serialNumber:'), { target: { value: 'SN' } });
    fireEvent.change(screen.getByLabelText('field.defectType:'), { target: { value: 'scratch' } });
    fireEvent.change(screen.getByLabelText('field.orderId'), { target: { value: '123' } });
    fireEvent.click(screen.getByLabelText('field.warning'));
    fireEvent.click(screen.getByLabelText('field.critical'));
    expect(apiClient.get).toHaveBeenCalledTimes(count);
    fireEvent.click(screen.getByText('order.applyFilters'));
    const filters = { totalResult: 'NOK', cameraNumber: 2, itemId: 'kus', serialNumber: 'SN',
        defectType: 'scratch', orderId: 123, attentionFlag: true, criticalFlag: true };
    await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/items', {
        params: { ...filters, page: 0, size: 10 },
    }));
    fireEvent.change(screen.getByLabelText('field.itemId:'), { target: { value: 'draft' } });
    fireEvent.click(screen.getByText('Next page'));
    await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/items', {
        params: { ...filters, page: 1, size: 10 },
    }));
    fireEvent.click(screen.getByText('Resize page'));
    await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/items', {
        params: { ...filters, page: 0, size: 20 },
    }));
    fireEvent.click(screen.getByText('order.clearFilters'));
    await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/items', {
        params: { page: 0, size: 20 },
    }));
    expect(screen.getByLabelText('field.itemId:')).toHaveValue('');
    expect(screen.getByLabelText('field.result:')).toHaveValue('');
});
