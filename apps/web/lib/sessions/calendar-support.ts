import type { MeetingProvider, Trainer } from '@/types';
import type { AdminSession } from '@/lib/mock-data/admin-workflows';

type CalendarProvider = NonNullable<Trainer['calendarProvider']>;

export function supportsMeetingProvider(
  calendarProvider: CalendarProvider | undefined,
  meetingProvider: AdminSession['meetingProvider'] | MeetingProvider | undefined,
) {
  if (!calendarProvider || calendarProvider === 'none') return false;

  const provider = meetingProvider ?? 'google-meet';
  if (provider === 'google-meet') return calendarProvider === 'google';

  return false;
}

export function calendarSupportMessage(meetingProvider: AdminSession['meetingProvider'] | undefined) {
  if ((meetingProvider ?? 'google-meet') === 'google-meet') {
    return 'A Google-connected calendar is required to accept this session.';
  }

  return 'A supported calendar connection is required to accept this session.';
}
