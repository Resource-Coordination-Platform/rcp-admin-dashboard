"use client";
import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, MapPin, PackageCheck, Search, Send, Truck } from 'lucide-react';
import { useRequests } from '@/lib/hooks';
import { useGoodsDeliveries, useGoodsDeliveryAction, useVerifyHelpRequest, goodsStatus, GoodsDelivery } from '@/lib/deliveries';
import type { HelpRequestRead } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, Button, Card, Input, Select, Skeleton } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { ClaimRequestModal } from './claim-request-modal';
import { useToast } from '@/components/ui/toast';
import { formatDateTime, formatRequestedItems } from '@/lib/format';

export default function HelpRequestsWorkspace() {
  const requests = useRequests();
  const deliveries = useGoodsDeliveries();
  const verify = useVerifyHelpRequest();
  const action = useGoodsDeliveryAction();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [reserve, setReserve] = useState<HelpRequestRead | null>(null);
  const [handover, setHandover] = useState<GoodsDelivery | null>(null);
  const byRequest = new Map((deliveries.data ?? []).map(delivery => [delivery.victim_request_id, delivery]));
  const stage = (request: HelpRequestRead) => byRequest.get(request.id)?.status || request.delivery_status || request.status.toUpperCase();
  const rows = (requests.data ?? []).filter(request => {
    const current = stage(request);
    const matchesFilter = filter === 'all' || current === filter || (filter === 'COMPLETED' && current === 'FULFILLED');
    return matchesFilter && `${request.id} ${request.description} ${formatRequestedItems(request)} ${byRequest.get(request.id)?.volunteer_name || ''}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const busy = verify.isPending || action.isPending;
  const reliable = !deliveries.isLoading && !deliveries.error && !requests.error;
  const verifyRequest = async (request: HelpRequestRead) => {
    try { await verify.mutateAsync(request.id); toast.success('Request verified', 'You can now reserve the requested supplies.'); }
    catch (error) { toast.error('Verification failed', error instanceof Error ? error.message : 'Please retry'); }
  };
  const sendAssignment = async (delivery: GoodsDelivery) => {
    try { await action.mutateAsync({ id: delivery.id, action: 'broadcast' }); toast.success('Assignment sent', `Active volunteers in ${delivery.district} can now accept this delivery.`); }
    catch (error) { toast.error('Could not send assignment', error instanceof Error ? error.message : 'Please retry'); }
  };
  const confirmHandover = async () => {
    if (!handover) return;
    try {
      await action.mutateAsync({ id: handover.id, action: 'handover' });
      toast.success('Goods handed over', 'Stock deducted and collection recorded for the volunteer and victim.');
      setHandover(null);
    } catch (error) { toast.error('Handover failed', error instanceof Error ? error.message : 'Please retry'); }
  };
  return <div className="space-y-6">
    <PageHeader title="Help Requests" description="Victim requests arrive after Grama Niladhari verification. Reserve supplies, send a volunteer and track confirmed receipt." />
    <div className="grid gap-3 sm:grid-cols-4">
      {[
        ['Awaiting verification', (requests.data ?? []).filter(r => stage(r) === 'PENDING').length],
        ['Stock reserved', (requests.data ?? []).filter(r => stage(r) === 'RESERVED').length],
        ['Volunteer deliveries', (deliveries.data ?? []).filter(d => !['RESERVED', 'COMPLETED'].includes(d.status)).length],
        ['Successfully fulfilled', (requests.data ?? []).filter(r => ['COMPLETED', 'FULFILLED'].includes(stage(r))).length],
      ].map(([label, count]) => <Card key={label} className="p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{count}</p></Card>)}
    </div>
    <Card className="p-4 flex flex-col gap-3 sm:flex-row">
      <div className="flex flex-1 items-center gap-2"><Search className="h-4 w-4 text-slate-400" /><Input aria-label="Search help requests" placeholder="Search request, supplies or volunteer" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <Select aria-label="Request stage" value={filter} onChange={event => setFilter(event.target.value)}>
        {Object.entries({ all: 'All requests', PENDING: 'Pending verification', VERIFIED: 'Verified — reserve stock', RESERVED: 'Reserved — send assignment', OPEN: 'Waiting for volunteer', ACCEPTED: 'Ready for warehouse handover', COLLECTED: 'Collected from warehouse', EN_ROUTE: 'En route', CODE_VERIFIED: 'Victim code verified', AWAITING_CONFIRMATION: 'Awaiting confirmations', COMPLETED: 'Successfully fulfilled' }).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </Select>
    </Card>
    {(requests.error || deliveries.error) && <Card className="p-4 text-red-700" role="alert">Could not refresh requests or delivery progress. <button onClick={() => { void requests.refetch(); void deliveries.refetch(); }}>Retry</button></Card>}
    {requests.isLoading ? <Skeleton className="h-40" /> : rows.map(request => {
      const delivery = byRequest.get(request.id);
      const current = stage(request);
      const completed = ['COMPLETED', 'FULFILLED'].includes(current);
      return <Card key={request.id} id={`request-${request.id}`} className="overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">Request #{request.id.slice(0, 8)}</h2><p className="text-xs text-slate-500 mt-1">{formatDateTime(request.created_at)}{request.disaster_type && ` · ${request.disaster_type}`}</p></div><Badge tone={completed ? 'success' : 'warning'}>{completed ? 'Help request fulfilled' : goodsStatus[current] || (current === 'VERIFIED' ? 'Verified — ready to reserve' : current === 'PENDING' ? 'Awaiting verification' : current.replaceAll('_', ' '))}</Badge></div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div><h3 className="font-medium text-sm mb-2">Requested supplies</h3>
              {request.requested_items?.length ? (
                <div className="space-y-1">{request.requested_items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm gap-3">
                    <span>{item.label}</span>
                    <strong>{item.quantity ?? '?'} {item.unit}</strong>
                  </div>
                ))}</div>
              ) : <p className="text-sm leading-6">{formatRequestedItems(request) || `${request.quantity_needed || 1} units requested`}</p>}
              {request.description && <p className="mt-2 text-sm text-slate-600">{request.description}</p>}
              {request.latitude != null && request.longitude != null && <a className="inline-flex gap-1 items-center mt-3 text-sm text-brand-600" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}><MapPin className="h-4 w-4" /> Victim location</a>}
              {request.verified_at && <p className="mt-2 text-xs text-slate-500">Verified {formatDateTime(request.verified_at)}</p>}
            </div>
            {delivery && <div className="rounded-xl bg-slate-50 p-4 space-y-2"><h3 className="flex items-center gap-2 font-medium text-sm"><PackageCheck className="h-4 w-4" /> Reserved / supplied goods</h3>{delivery.lines.map(line => <p key={line.id} className="flex justify-between text-sm gap-3"><span>{line.name}</span><strong>{line.quantity} {line.unit}</strong></p>)}<p className="pt-2 text-sm"><strong>Volunteer:</strong> {delivery.volunteer_name || (current === 'RESERVED' ? 'Assignment not sent yet' : 'Waiting for acceptance')}</p><p className="text-sm"><strong>Pickup centre:</strong> {delivery.pickup_name}</p><p className="text-sm"><strong>Delivery district:</strong> {delivery.district}</p></div>}
          </div>
          {current === 'PENDING' && <Button disabled={!reliable || busy} onClick={() => void verifyRequest(request)}><ClipboardCheck className="h-4 w-4" /> Verify request</Button>}
          {current === 'VERIFIED' && !delivery && <Button disabled={!reliable || busy} onClick={() => setReserve(request)}><PackageCheck className="h-4 w-4" /> Reserve requested goods</Button>}
          {delivery?.status === 'RESERVED' && <Button disabled={!reliable || busy} onClick={() => void sendAssignment(delivery)}><Send className="h-4 w-4" /> Send delivery assignment</Button>}
          {delivery?.status === 'OPEN' && <p className="text-sm font-medium text-brand-700">Assignment sent to active volunteers in {delivery.district}. Waiting for one volunteer to accept.</p>}
          {delivery?.status === 'ACCEPTED' && <Button disabled={!reliable || busy} onClick={() => setHandover(delivery)}><Truck className="h-4 w-4" /> Hand goods to volunteer</Button>}
          {completed && <p className="flex gap-2 text-green-700 text-sm font-medium"><CheckCircle2 className="h-5 w-5" /> {delivery ? 'Code verified. Volunteer and victim both confirmed delivery.' : 'This request has been fulfilled.'}</p>}
        </div>
        {delivery && <div className="border-t bg-slate-50/50 p-5 space-y-3">
          <div className="flex flex-wrap gap-2">{[['Warehouse handover', delivery.handed_over_at], ['Victim code verified', delivery.code_verified_at], ['Volunteer confirmed', delivery.volunteer_confirmed_at], ['Victim confirmed', delivery.victim_confirmed_at]].map(([label, at]) => <Badge key={label} tone={at ? 'success' : 'neutral'}>{at ? 'Done: ' : 'Pending: '}{label}</Badge>)}</div>
          <details className="text-sm"><summary className="cursor-pointer text-slate-600">Request delivery history</summary><ol className="mt-3 space-y-2">{delivery.history.map((entry, index) => <li key={index}>{entry.action.replaceAll('_', ' ')} · {formatDateTime(entry.created_at)}</li>)}</ol></details>
        </div>}
      </Card>;
    })}
    {!requests.isLoading && !requests.error && !rows.length && <Card className="p-8 text-center text-slate-500">No requests match this view. Victim requests appear here after Grama Niladhari verification.</Card>}
    <p className="text-xs text-slate-500">Updates every 5 seconds. A delivery completes only after code verification and both receipt confirmations.</p>
    {reserve && <ClaimRequestModal key={reserve.id} request={reserve} isOpen onClose={() => setReserve(null)} />}
    <Modal open={!!handover} onClose={() => setHandover(null)} title="Confirm physical handover" footer={<><Button variant="outline" onClick={() => setHandover(null)}>Cancel</Button><Button loading={action.isPending} onClick={confirmHandover}>Goods handed over</Button></>}>
      <p className="text-sm leading-6">Confirm after giving these goods to <strong>{handover?.volunteer_name}</strong> at <strong>{handover?.pickup_name}</strong>. This records collection and deducts the reserved stock.</p>
      <ul className="mt-4 space-y-2">{handover?.lines.map(line => <li key={line.id}>{line.name}: <strong>{line.quantity} {line.unit}</strong></li>)}</ul>
    </Modal>
  </div>;
}
