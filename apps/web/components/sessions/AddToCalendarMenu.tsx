'use client';

import { CalendarPlus2, ChevronDown, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sessionCalendarFileUrl, type SessionRecord } from '@/lib/api/sessions';

export function AddToCalendarMenu({ session }: { session: SessionRecord }) {
  const details = [
    session.notes,
    session.meetingUrl ? `Join the meeting: ${session.meetingUrl}` : 'Open BID Hub for the latest joining details.',
  ].filter(Boolean).join('\n\n');
  const googleUrl = calendarUrl('google', session, details);
  const outlookUrl = calendarUrl('outlook', session, details);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <CalendarPlus2 className="h-4 w-4" />
          Add to calendar
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 rounded-xl border-border bg-surface-panel p-1.5 shadow-xl">
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5 focus:bg-bid-light focus:text-bid-dark">
          <a href={sessionCalendarFileUrl(session.id)} download>
            <Download className="mr-2 h-4 w-4" />
            Apple Calendar or calendar file
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5 focus:bg-bid-light focus:text-bid-dark">
          <a href={googleUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Add to Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5 focus:bg-bid-light focus:text-bid-dark">
          <a href={outlookUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Add to Outlook
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function calendarUrl(
  provider: 'google' | 'outlook',
  session: SessionRecord,
  details: string,
) {
  if (provider === 'google') {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: session.topic,
      dates: `${googleTimestamp(session.startAt)}/${googleTimestamp(session.endAt)}`,
      details,
      location: session.meetingUrl ?? 'BID Hub',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: session.topic,
    startdt: new Date(session.startAt).toISOString(),
    enddt: new Date(session.endAt).toISOString(),
    body: details,
    location: session.meetingUrl ?? 'BID Hub',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function googleTimestamp(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
