import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrderDetail from './OrderDetail';
import apiClient from '../api/client';

jest.mock('react-router-dom', () => ({
    useParams: () => ({ id: '123' }),
    useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock('../api/client');
jest.mock('../components/ItemDetailContent', () => () => null);
jest.mock('../i18n/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
// Simulate the Table callbacks; keep the page's state and HTTP requests real.
jest.mock('antd', () => {
    const React = require('react');
    const Box = ({ children }: any) => <div>{children}</div>;
    const Button = ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>;
    const TextArea = ({ value, onChange }: any) => <textarea value={value} onChange={onChange} />;
    const Input = Object.assign(({ id, value, onChange, placeholder }: any) => (
        <input id={id} value={value || ''} onChange={onChange} placeholder={placeholder} />
    ), { TextArea });
    const Select = Object.assign(() => null, { Option: Box });
    return {
        Card: Box, Row: Box, Col: Box, Space: Box, Tag: Box, Tooltip: Box,
        Typography: { Title: Box, Text: Box }, Descriptions: Object.assign(Box, { Item: Box }),
        Button, Input, Select, Divider: () => null, Progress: () => null, Badge: () => null,
        Checkbox: () => null, Drawer: () => null, Spin: () => <div>Loading</div>,
        Statistic: () => null, message: { success: jest.fn(), error: jest.fn() },
        Table: ({ columns, pagination, onChange, dataSource }: any) => {
            const resultColumn = columns.find((column: any) => column.key === 'totalResult');
            return <div>
                <span data-testid="result-filter">{JSON.stringify(resultColumn.filteredValue)}</span>
                <span data-testid="page">{pagination.current}</span>
                <span data-testid="total">{pagination.total}</span>
                <span data-testid="items">{dataSource.map((item: any) => item.itemId).join(',')}</span>
                <span data-testid="local-filter">{String(Boolean(resultColumn.onFilter))}</span>
                <button onClick={() => onChange({}, { totalResult: ['NOK'] }, {}, { action: 'filter' })}>NOK filter</button>
                <button onClick={() => onChange({}, { totalResult: null }, {}, { action: 'filter' })}>Clear result</button>
                <button onClick={() => pagination.onChange(2, 20)}>Next page</button>
                <button onClick={() => pagination.onChange(2, 50)}>Resize page</button>
            </div>;
        },
    };
});

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: jest.fn().mockImplementation(() => ({
        matches: false, addListener: jest.fn(), removeListener: jest.fn(),
        addEventListener: jest.fn(), removeEventListener: jest.fn(),
    })) });
});

beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockImplementation((url, { params }) => Promise.resolve({ data: {
        orderId: 1001, orderNumber: '123', totalCount: 50, totalElements: params.totalResult ? 25 : 50,
        currentPage: params.page, size: params.size, items: [{ id: 1, itemId: `page-${params.page}` }], comment: '',
    } }));
});

test('column filter applies to server paging, persists on the next page, and clears coherently', async () => {
    render(<OrderDetail />);
    await screen.findByText('NOK filter');
    expect(screen.getByTestId('local-filter')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('Next page'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('2'));
    fireEvent.click(screen.getByText('NOK filter'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('1'));
    expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/orderDetailWithItems/123', {
        params: { totalResult: 'NOK', page: 0, size: 20 },
    });
    expect(screen.getByTestId('total')).toHaveTextContent('25');
    expect(screen.getByTestId('result-filter')).toHaveTextContent('["NOK"]');
    fireEvent.click(screen.getByText('Next page'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('2'));
    expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/orderDetailWithItems/123', {
        params: { totalResult: 'NOK', page: 1, size: 20 },
    });
    expect(screen.getByTestId('result-filter')).toHaveTextContent('["NOK"]');
    fireEvent.click(screen.getByText('Resize page'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('1'));
    expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/orderDetailWithItems/123', {
        params: { totalResult: 'NOK', page: 0, size: 50 },
    });
    fireEvent.click(screen.getByText('Clear result'));
    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('50'));
    expect(screen.getByTestId('result-filter')).toHaveTextContent('null');
});

test('saving a comment does not replace the filtered page with the comment response items', async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({ data: {
        comment: 'Saved', items: [{ id: 99, itemId: 'unfiltered-item' }],
    } });
    render(<OrderDetail />);
    await screen.findByText('NOK filter');
    fireEvent.click(screen.getByText('NOK filter'));
    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('25'));
    fireEvent.click(screen.getByText('Next page'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('2'));
    fireEvent.click(screen.getByText('order.saveComment'));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Saved'));
    expect(screen.getByTestId('page')).toHaveTextContent('2');
    expect(screen.getByTestId('result-filter')).toHaveTextContent('["NOK"]');
    expect(screen.getByTestId('items')).toHaveTextContent('page-1');
    expect(screen.getByTestId('items')).not.toHaveTextContent('unfiltered-item');
});


test('panel edits are applied together only on confirmation and drafts do not affect pagination', async () => {
    render(<OrderDetail />);
    await screen.findByText('NOK filter');
    fireEvent.click(screen.getByText('Next page'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('2'));
    fireEvent.click(screen.getByText('common.filters'));
    const requestsBeforeEditing = (apiClient.get as jest.Mock).mock.calls.length;
    fireEvent.change(screen.getByLabelText('catalog.mainCode:'), { target: { value: '3.1.1' } });
    fireEvent.change(screen.getByLabelText('SKU:'), { target: { value: 'sku' } });
    fireEvent.change(screen.getByLabelText('REF:'), { target: { value: 'ref' } });
    fireEvent.change(screen.getByPlaceholderText('placeholder.searchItemId'), { target: { value: 'kus' } });
    fireEvent.change(screen.getByPlaceholderText('placeholder.searchSerial'), { target: { value: '123' } });
    expect(apiClient.get).toHaveBeenCalledTimes(requestsBeforeEditing);
    expect(screen.getByTestId('page')).toHaveTextContent('2');
    fireEvent.click(screen.getByText('order.applyFilters'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('1'));
    expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/orderDetailWithItems/123', {
        params: { mainDefectCode: '3.1.1', sku: 'sku', ref: 'ref', itemId: 'kus', serialNumber: '123', page: 0, size: 20 },
    });
    fireEvent.change(screen.getByPlaceholderText('placeholder.searchSerial'), { target: { value: '456' } });
    fireEvent.click(screen.getByText('Next page'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('2'));
    expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/orderDetailWithItems/123', {
        params: { mainDefectCode: '3.1.1', sku: 'sku', ref: 'ref', itemId: 'kus', serialNumber: '123', page: 1, size: 20 },
    });
    expect(screen.getByPlaceholderText('placeholder.searchSerial')).toHaveValue('456');
    fireEvent.click(screen.getByText('order.clearFilters'));
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('1'));
    expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/orderDetailWithItems/123', {
        params: { page: 0, size: 20 },
    });
    fireEvent.click(screen.getByText('common.filters'));
    expect(screen.getByPlaceholderText('placeholder.searchItemId')).toHaveValue('');
    expect(screen.getByPlaceholderText('placeholder.searchSerial')).toHaveValue('');
    expect(screen.getByLabelText('catalog.mainCode:')).toHaveValue('');
    expect(screen.getByLabelText('SKU:')).toHaveValue('');
    expect(screen.getByLabelText('REF:')).toHaveValue('');
});
