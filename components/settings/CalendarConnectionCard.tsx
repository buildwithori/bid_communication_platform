'use client';

import { CalendarCheck, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card, CardHeader } from '@/components/shared/Card';

export function CalendarConnectionCard({
  connected,
  accountEmail,
  onConnect,
  onDisconnect,
}: {
  connected: boolean;
  accountEmail?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Calendar connection"
        description="Authenticate with Google so BID can access your calendar for session scheduling."
        actions={<CalendarCheck className="h-5 w-5 text-ink-faint" />}
      />
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <CheckCircle2 className={connected ? 'h-4 w-4 text-success' : 'h-4 w-4 text-ink-faint'} />
                {connected ? 'Google Calendar connected' : 'Google Calendar not connected'}
              </div>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                {connected
                  ? `${accountEmail || 'Your Google account'} is authenticated with Google Calendar.`
                  : 'Authenticate with Google to let BID check availability and manage session events.'}
              </p>
            </div>
            <Badge tone={connected ? 'green' : 'amber'}>
              {connected ? 'Connected' : 'Action needed'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          {connected ? (
            <Button
              type="button"
              variant="outline"
              className="border-danger/35 text-danger hover:border-danger/55 hover:bg-danger/10 hover:text-danger-dark"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          ) : (
            <Button type="button" onClick={onConnect}>
              Authenticate with Google
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
