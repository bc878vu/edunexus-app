import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ConfirmDialog, useConfirm } from './ConfirmDialog';

test('ConfirmDialog renders message with Confirm and Cancel buttons', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <ConfirmDialog
      message="Delete this item?"
      confirmLabel="Delete"
      danger={true}
      busy={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
  expect(screen.getByText('Delete this item?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
});

test('ConfirmDialog calls onConfirm and onCancel on button clicks', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <ConfirmDialog
      message="Are you sure?"
      busy={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('ConfirmDialog disables buttons while busy', () => {
  render(
    <ConfirmDialog
      message="Working..."
      busy={true}
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );
  expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
});

function Harness({ onConfirmSpy }) {
  const { requestConfirm, ConfirmUI } = useConfirm();
  return (
    <div>
      <button onClick={() => requestConfirm({ message: 'Proceed?', onConfirm: onConfirmSpy })}>
        Open confirm
      </button>
      <ConfirmUI />
    </div>
  );
}

test('useConfirm shows modal on requestConfirm and runs onConfirm', async () => {
  const onConfirmSpy = jest.fn().mockResolvedValue(undefined);
  render(<Harness onConfirmSpy={onConfirmSpy} />);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText('Proceed?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(onConfirmSpy).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
});

test('useConfirm dismisses modal on Cancel without running onConfirm', () => {
  const onConfirmSpy = jest.fn();
  render(<Harness onConfirmSpy={onConfirmSpy} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(onConfirmSpy).not.toHaveBeenCalled();
});
