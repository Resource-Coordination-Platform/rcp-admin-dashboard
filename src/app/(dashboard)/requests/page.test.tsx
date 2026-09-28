import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RequestsPage from './page';

const mocks = vi.hoisted(() => ({ action: vi.fn().mockResolvedValue({}), verify: vi.fn().mockResolvedValue({}), success: vi.fn(), status: 'ACCEPTED' }));
vi.mock('@/lib/hooks', () => ({ useRequests: () => ({ data: [{
  id: 'request-1', status: mocks.status === 'PENDING' ? 'pending' : 'in_progress',
  description: 'Family needs meals', created_at: '2026-09-26T10:00:00Z',
  requested_items: [{ code: 'food', label: 'Meals', quantity: 10, unit: 'packs' }],
}], isLoading: false }) }));
vi.mock('@/components/features/claim-request-modal', () => ({ ClaimRequestModal: () => null }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success: mocks.success, error: vi.fn() }) }));
vi.mock('@/lib/deliveries', () => ({
  goodsStatus: { ACCEPTED: 'Awaiting centre collection', RESERVED: 'Stock reserved' },
  useVerifyHelpRequest: () => ({ mutateAsync: mocks.verify, isPending: false }),
  useGoodsDeliveryAction: () => ({ mutateAsync: mocks.action, isPending: false }),
  useGoodsDeliveries: () => ({ isLoading: false, data: mocks.status === 'PENDING' ? [] : [{
    id: 'delivery-1', victim_request_id: 'request-1', district: 'Galle', status: mocks.status,
    volunteer_name: 'Delivery Volunteer', pickup_name: 'Relief Centre', pickup_latitude: 6, pickup_longitude: 80,
    destination_latitude: 6.1, destination_longitude: 80.1,
    lines: [{ id: 'line-1', name: 'Meal packs', quantity: 10, unit: 'packs' }], history: [],
  }] }),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.status = 'ACCEPTED'; });

describe('Help Requests workflow', () => {
  it('shows requested quantities, delivery and both confirmations in one request', () => {
    render(<RequestsPage />);
    expect(screen.getByText('Help Requests')).toBeInTheDocument();
    expect(screen.getByText('Meals: 10 packs')).toBeInTheDocument();
    expect(screen.getByText('Awaiting centre collection')).toBeInTheDocument();
    expect(screen.getByText(/Victim confirmed/)).toBeInTheDocument();
    expect(screen.getByText(/Volunteer confirmed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete delivery/i })).not.toBeInTheDocument();
  });
  it('requires physical handover confirmation before deducting stock', async () => {
    render(<RequestsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Hand goods to volunteer' }));
    expect(mocks.action).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm physical handover')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Goods handed over' }));
    await waitFor(() => expect(mocks.action).toHaveBeenCalledWith({ id: 'delivery-1', action: 'handover' }));
  });
  it('requires verification before offering stock reservation', async () => {
    mocks.status = 'PENDING';
    render(<RequestsPage />);
    expect(screen.queryByRole('button', { name: 'Reserve requested goods' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verify request' }));
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith('request-1'));
  });
  it('sends the assignment only after the admin broadcasts reserved goods', async () => {
    mocks.status = 'RESERVED';
    render(<RequestsPage />);
    expect(mocks.action).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Hand goods to volunteer' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send delivery assignment' }));
    await waitFor(() => expect(mocks.action).toHaveBeenCalledWith({ id: 'delivery-1', action: 'broadcast' }));
  });
});
