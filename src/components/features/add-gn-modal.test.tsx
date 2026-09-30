import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AddGNModal } from './add-gn-modal';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), invalidateQueries: vi.fn(), success: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get: mocks.get, post: mocks.post } }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success: mocks.success }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function fill() {
  for (const [name, value] of Object.entries({ 'Full name': 'GN Officer', Email: 'gn@example.com', Password: 'strong-password', Latitude: '6.9271', Longitude: '79.8612' })) {
    fireEvent.change(screen.getByLabelText(name), { target: { value } });
  }
}

it('requires a resolved division and creates a tenant-managed mobile account', async () => {
  mocks.get.mockResolvedValue({ gn_division_name: 'Suduwella', district: 'Colombo', ds_division: 'Colombo' });
  mocks.post.mockResolvedValue({ id: 'officer' });
  const close = vi.fn();
  render(<AddGNModal onClose={close} />);
  fill();
  expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Find GN division' }));
  await screen.findByText('Suduwella');
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(mocks.post).toHaveBeenCalledWith('/api/auth/tenants/me/grama-niladharis', expect.objectContaining({ email: 'gn@example.com', latitude: 6.9271, longitude: 79.8612 }));
});

it('does not allow provisioning when official boundary lookup fails', async () => {
  mocks.get.mockRejectedValue(new Error('GN boundary service unavailable'));
  render(<AddGNModal onClose={() => {}} />);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Find GN division' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('GN boundary service unavailable');
  expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  expect(mocks.post).not.toHaveBeenCalled();
});
