import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CostEditor } from '@/components/CostEditor';

test('adding a price saves it and shows the cost line', async () => {
  const onSave = vi.fn(async () => {});
  const { rerender } = render(<CostEditor cost={null} verdict="not_moving" onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add product price' }));
  fireEvent.change(screen.getByLabelText('Price ($)'), { target: { value: '24' } });
  fireEvent.change(screen.getByLabelText('One bottle lasts about (weeks)'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save price' }));
  await screen.findByRole('button', { name: 'Add product price' }).catch(() => null);
  expect(onSave).toHaveBeenCalledWith({ price: 24, weeksPerUnit: 8 });
  rerender(<CostEditor cost={{ price: 24, weeksPerUnit: 8 }} verdict="not_moving" onSave={onSave} />);
  expect(screen.getByText('Stopping saves about $13 a month.')).toBeInTheDocument();
});

test('an invalid price shows the reason and does not save', () => {
  const onSave = vi.fn();
  render(<CostEditor cost={null} verdict="working" onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add product price' }));
  fireEvent.change(screen.getByLabelText('Price ($)'), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save price' }));
  expect(screen.getByText('Enter a price greater than $0.')).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});
