'use client';

import * as React from 'react';
import { UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput, FormTextarea } from '@/components/shared/FormField';
import { CalendarConnectionCard } from '@/components/settings/CalendarConnectionCard';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { trainerById } from '@/lib/mock-data/trainers';
import { trainerSupportsEntrepreneur } from '@/lib/content-trainer-access';

const currentTrainerId = 't-kofi';

export default function TrainerSettingsPage() {
  const trainer = trainerById(currentTrainerId);
  const [fullName, setFullName] = React.useState(trainer?.fullName ?? '');
  const [email, setEmail] = React.useState(trainer?.email ?? '');
  const [bio, setBio] = React.useState('I support entrepreneurs with fundraising readiness, pricing strategy, and investor communication.');
  const [calendarConnected, setCalendarConnected] = React.useState(trainer?.calendarProvider === 'google');
  const [calendarAccount, setCalendarAccount] = React.useState(trainer?.calendarLink ?? trainer?.email ?? '');

  const isCalendarConnected = calendarConnected && calendarAccount.trim().length > 0;
  const learnerCount = entrepreneurs.filter((entrepreneur) => trainerSupportsEntrepreneur(currentTrainerId, entrepreneur)).length;

  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    toast.success('Profile settings saved');
  };

  const connectGoogleCalendar = () => {
    setCalendarConnected(true);
    setCalendarAccount(calendarAccount || email);
    toast.success('Google Calendar connection started');
  };

  const disconnectGoogleCalendar = () => {
    setCalendarConnected(false);
    toast.success('Google Calendar disconnected');
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage the profile and calendar details used across your trainer workspace."
      />

      <MetricGrid columns={3}>
        <StatCard
          label="Profile"
          value="Active"
          subline={trainer?.role ?? 'Trainer'}
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
          label="My entrepreneurs"
          value={learnerCount}
          subline="Entrepreneurs you support"
          dotColor="info"
          accent="info"
        />
      </MetricGrid>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader
            title="Profile details"
            description="These details appear in trainer lists, session ownership, and entrepreneur-facing booking flows."
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
                <FormInput value={trainer?.role ?? 'Trainer'} disabled />
              </FormField>
              <FormField label="Specialisms">
                <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-black/[0.1] bg-surface-subtle px-3 py-2">
                  {trainer?.specialisms.map((specialism) => (
                    <Badge key={specialism} tone="blue">{specialism}</Badge>
                  ))}
                </div>
              </FormField>
            </div>

            <FormField label="Trainer bio" optional>
              <FormTextarea
                rows={4}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Briefly describe the kind of support you provide."
              />
            </FormField>

            <div className="flex justify-end border-t border-line pt-4">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </Card>

        <CalendarConnectionCard
          connected={isCalendarConnected}
          accountEmail={calendarAccount}
          onConnect={connectGoogleCalendar}
          onDisconnect={disconnectGoogleCalendar}
        />
      </div>
    </>
  );
}
