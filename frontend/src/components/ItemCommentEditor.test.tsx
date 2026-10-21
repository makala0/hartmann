import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import apiClient from '../api/client';
import type { Item } from '../types';
import ItemCommentEditor from './ItemCommentEditor';

jest.mock('../api/client');
jest.mock('../i18n/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
jest.mock('antd', () => ({
    Card: ({ children }: any) => <div>{children}</div>,
    Button: ({ children, onClick, loading }: any) => <button onClick={onClick} disabled={loading}>{children}</button>,
    Input: { TextArea: ({ value, onChange, disabled, maxLength, ...props }: any) => (
        <textarea aria-label={props['aria-label']} value={value} onChange={onChange} disabled={disabled} maxLength={maxLength} />
    ) },
    message: { success: jest.fn(), error: jest.fn() },
}));

const item = { id: 1, comment: 'Original' } as Item;
beforeEach(() => { jest.clearAllMocks(); });

test('loads an existing comment and saves edits and an empty comment only on confirmation', async () => {
    const onItemChange = jest.fn();
    (apiClient.put as jest.Mock).mockImplementation((url, data) => Promise.resolve({ data: { ...item, ...data } }));
    render(<ItemCommentEditor item={item} onItemChange={onItemChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Original');
    fireEvent.change(input, { target: { value: 'New comment' } });
    expect(apiClient.put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onItemChange).toHaveBeenCalledWith({ ...item, comment: 'New comment' }));
    expect(apiClient.put).toHaveBeenLastCalledWith('/dashboard/item/1/comment', { comment: 'New comment' });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onItemChange).toHaveBeenLastCalledWith({ ...item, comment: '' }));
});

test('failed save keeps the draft available for retry', async () => {
    (apiClient.put as jest.Mock).mockRejectedValue(new Error('offline'));
    const onItemChange = jest.fn();
    render(<ItemCommentEditor item={item} onItemChange={onItemChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getByRole('textbox')).toHaveValue('Keep this draft');
    expect(onItemChange).not.toHaveBeenCalled();
});

test('navigating to a different item discards the old draft and ignores its pending save response', async () => {
    let complete!: (value: any) => void;
    (apiClient.put as jest.Mock).mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const onItemChange = jest.fn();
    const { rerender } = render(<ItemCommentEditor key={1} item={item} onItemChange={onItemChange} />);
    fireEvent.click(screen.getByRole('button'));
    rerender(<ItemCommentEditor key={2} item={{ ...item, id: 2, comment: 'Second' }} onItemChange={onItemChange} />);
    complete({ data: item });
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Second'));
    expect(onItemChange).not.toHaveBeenCalled();
});
