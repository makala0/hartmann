import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InspectionMode from './InspectionMode';
import apiClient from '../api/client';

jest.mock('../api/client');
jest.mock('../components/ItemDetailContent', () => ({ item }: any) => <div>{item.itemId}</div>);
jest.mock('../i18n/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
jest.mock('antd', () => {
    const Box = ({ children }: any) => <div>{children}</div>;
    return { Card: Box, Spin: () => null, Typography: { Title: Box, Text: Box },
        message: { success: jest.fn(), error: jest.fn() } };
});

test('scans the full serial number including leading zeros and nonnumeric characters', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { itemId: 'found-item' } });
    render(<InspectionMode />);
    for (const key of '000SN-42') fireEvent.keyDown(window, { key });
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/dashboard/scan', {
        params: { serialNumber: '000SN-42' },
    }));
    expect(await screen.findByText('found-item')).toBeInTheDocument();
});
