"use client";
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type Boundary = { gn_division_name: string; district: string; ds_division: string };

export function AddGNModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cache = useQueryClient();
  const toast = useToast();
  const validLocation = latitude.trim() !== '' && longitude.trim() !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180;

  async function lookup() {
    setBusy(true); setError(''); setBoundary(null);
    try { setBoundary(await api.get<Boundary>('/api/auth/tenants/me/gn-boundary', { query: { latitude: Number(latitude), longitude: Number(longitude) } })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Boundary lookup failed.'); }
    finally { setBusy(false); }
  }
  async function create() {
    setBusy(true); setError('');
    try {
      await api.post('/api/auth/tenants/me/grama-niladharis', { full_name: name.trim(), email: email.trim().toLowerCase(), password, phone: phone.trim() || null, latitude: Number(latitude), longitude: Number(longitude) });
      await cache.invalidateQueries({ queryKey: ['coordinators'] });
      toast.success('Grama Niladhari added', 'They can sign in to the mobile app with this email and password.');
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create account.'); }
    finally { setBusy(false); }
  }
  return <Modal open onClose={onClose} title="Add Grama Niladhari" description="Create a mobile login and assign the official GN division containing their location." footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!boundary || !validLocation || name.trim().length < 2 || !email.includes('@') || password.length < 10} onClick={create}>Create account</Button></>}>
    <div className="space-y-4">
      <Field label="Full name" required><Input aria-label="Full name" value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="Email" required><Input aria-label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" /></Field>
      <Field label="Password" required hint="At least 10 characters. Share with the officer securely."><Input aria-label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></Field>
      <Field label="Phone"><Input aria-label="Phone" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" required><Input aria-label="Latitude" type="number" step="any" disabled={busy} value={latitude} onChange={e => { setLatitude(e.target.value); setBoundary(null); }} placeholder="6.9271" /></Field>
        <Field label="Longitude" required><Input aria-label="Longitude" type="number" step="any" disabled={busy} value={longitude} onChange={e => { setLongitude(e.target.value); setBoundary(null); }} placeholder="79.8612" /></Field>
      </div>
      <p className="text-xs text-slate-500">Enter a location inside the officer&apos;s GN division. Its official polygon is retrieved and saved automatically when creating the account.</p>
      <Button variant="outline" disabled={!validLocation || busy} onClick={lookup}>Find GN division</Button>
      {boundary && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><strong>{boundary.gn_division_name}</strong><p>{boundary.ds_division} · {boundary.district}</p><p>Only victim requests inside this boundary will reach this officer.</p></div>}
      {!!error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  </Modal>;
}
