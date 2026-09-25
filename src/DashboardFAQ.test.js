import React from 'react';
import { render, screen, within } from '@testing-library/react';
import DashboardFAQ from './DashboardFAQ';

test('dashboard FAQ renders its questions and shows the first answer immediately', () => {
  const { container } = render(<DashboardFAQ />);
  const region = screen.getByRole('region', { name: 'Frequently asked questions' });
  expect(region).toBeInTheDocument();
  expect(within(region).getByText('Where can I find notes, handouts and past papers?')).toBeInTheDocument();
  expect(within(region).getByText(/Open Academic Hub and choose your subject/)).toBeInTheDocument();
  expect(container.querySelector('#home-faq')).not.toBeNull();
  const details = container.querySelectorAll('details');
  expect(details).toHaveLength(8);
  expect(details[0].open).toBe(true);
  expect(within(region).getByRole('link', { name: /Browse Academic Hub/ })).toHaveAttribute('href','/?page=academic');
  expect(within(region).getByRole('link', { name: /Open Exam Prep/ })).toHaveAttribute('href','/?page=exam-prep');
});
