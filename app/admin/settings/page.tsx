'use client';

import * as React from 'react';
import { ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput, FormTextarea } from '@/components/shared/FormField';
import { CalendarConnectionCard } from '@/components/settings/CalendarConnectionCard';

export default function AdminSettingsPage() {
  const [fullName, setFullName] = React.useState('Ama Darko');
  const [email, setEmail] = React.useState('ama.darko@bid.org');
  const [phone, setPhone] = React.useState('+233 24 555 0120');
  const [bio, setBio] = React.useState('Programme lead responsible for entrepreneur operations, sessions, and reporting oversight.');
  const [calendarConnected, setCalendarConnected] = React.useState(true);
  const isCalendarConnected = calendarConnected && email.trim().length > 0;

  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    toast.success('Admin settings saved');
  };

  const connectGoogleCalendar = () => {
    setCalendarConnected(true);
    toast.success('Google Calendar connection started');
  };

  const disconnectGoogleCalendar = () => {
    setCalendarConnected(false);
    toast.success('Google Calendar disconnected');
  };

  return (
    <>
      <PageHeader
        title="Admin settings"
        description="Manage the profile and calendar connection used when you own BID sessions."
      />

      <MetricGrid columns={3}>
        <StatCard
          label="Admin profile"
          value="Active"
          subline="Programme lead"
          dotColor="success"
          accent="success"
        />
        <StatCard
          label="Calendar"
          value={isCalendarConnected ? 'Connected' : 'Not connected'}
          subline="Google Meet sessions"
          dotColor={isCalendarConnected ? 'success' : 'warning'}
          accent={isCalendarConnected ? 'success' : 'warning'}
        />
        <StatCard
          label="Access"
          value="Full"
          subline="Admin workspace"
          dotColor="bid"
          accent="bid"
        />
      </MetricGrid>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader
            title="Profile details"
            description="These details appear when you own sessions, send feedback, or manage operational work."
            actions={<UserRound className="h-5 w-5 text-ink-faint" />}
          />
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name">
                <FormInput value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </FormField>
              <FormField label="Email">
                <FormInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Role">
                <FormInput value="Programme lead" disabled />
              </FormField>
              <FormField label="Phone number" optional>
                <FormInput value={phone} onChange={(event) => setPhone(event.target.value)} />
              </FormField>
            </div>

            <FormField label="Access">
              <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-black/[0.1] bg-surface-subtle px-3 py-2">
                <Badge tone="brand">Admin workspace</Badge>
                <Badge tone="green">Can manage sessions</Badge>
                <Badge tone="blue">Can invite admins</Badge>
              </div>
            </FormField>

            <FormField label="Admin bio" optional>
              <FormTextarea
                rows={4}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Briefly describe your operational responsibility."
              />
            </FormField>

            <div className="flex justify-end border-t border-line pt-4">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Session ownership"
              description="Admins with a connected Google Calendar can accept open BID team session requests and create Google Meet events."
              actions={<ShieldCheck className="h-5 w-5 text-ink-faint" />}
            />
            <div className="rounded-xl bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-muted">
              Calendar authentication is required before an admin can own a confirmed Google Meet session.
            </div>
          </Card>
          <CalendarConnectionCard
            connected={isCalendarConnected}
            accountEmail={email}
            onConnect={connectGoogleCalendar}
            onDisconnect={disconnectGoogleCalendar}
          />
        </div>
      </div>
    </>
  );
}
