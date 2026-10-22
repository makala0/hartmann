import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from 'antd';
import ItemPrioritySummary from './ItemPrioritySummary';

jest.mock('../i18n/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
jest.mock('antd', () => ({
    Tag: ({ children }: any) => <span>{children}</span>,
    Button: ({ children, onClick, title }: any) => <button title={title} onClick={onClick}>{children}</button>,
    Modal: { info: jest.fn() },
}));

test('shows the winning station and code with an explanation accessible by click', () => {
    render(<ItemPrioritySummary priority={{ status: 'COMPLETE', result: 'NOK', station: 2,
        code: '2.0.1', logicalKey: 'ST2_NOK', codeVersion: 'temporary-v1' }} />);
    expect(screen.getByRole('button')).toHaveTextContent('NOK · ST2 · 2.0.1');
    fireEvent.click(screen.getByRole('button'));
    expect(Modal.info).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining('temporary-v1'),
    }));
});

test('unknown results never display an invented defect code', () => {
    render(<ItemPrioritySummary priority={{ status: 'INCOMPLETE' }} />);
    expect(screen.getByText('priority.incomplete')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
});

test('all OK displays OK without assigning a station defect', () => {
    render(<ItemPrioritySummary priority={{ status: 'COMPLETE', result: 'OK' }} />);
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
});
