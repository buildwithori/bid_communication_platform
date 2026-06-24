import type { Trainer } from '@/types';

/**
 * Seed trainers. The `metrics.status` drives the colored status badge in
 * the admin Trainers table; `accessExpiresOn` is only relevant for guest
 * access.
 */
export const trainers: Trainer[] = [
  {
    id: 't-kofi',
    fullName: 'Kofi Mensah',
    initials: 'KM',
    email: 'kofi.mensah@bid.org',
    role: 'Mentor',
    accessLevel: 'full',
    specialisms: ['fintech'],
    maxEntrepreneurs: 10,
    calendarProvider: 'google',
    calendarLink: 'kofi.mensah@bid.org',
    metrics: {
      entrepreneursCount: 8,
      sessionsThisMonth: 14,
      satisfactionAvg: 4.8,
      satisfactionRatingsCount: 22,
      status: 'active',
    },
  },
  {
    id: 't-esi',
    fullName: 'Esi Adu',
    initials: 'EA',
    email: 'esi.adu@bid.org',
    role: 'Trainer',
    accessLevel: 'full',
    specialisms: ['agritech'],
    maxEntrepreneurs: 10,
    calendarProvider: 'calendly',
    calendarLink: 'calendly.com/esi-bid',
    metrics: {
      entrepreneursCount: 6,
      sessionsThisMonth: 9,
      satisfactionAvg: 4.6,
      satisfactionRatingsCount: 14,
      status: 'active',
    },
  },
  {
    id: 't-james',
    fullName: 'James Tetteh',
    initials: 'JT',
    email: 'james.tetteh@bid.org',
    role: 'Trainer',
    accessLevel: 'full',
    specialisms: ['logistics'],
    maxEntrepreneurs: 10,
    metrics: {
      entrepreneursCount: 5,
      sessionsThisMonth: 7,
      satisfactionAvg: 4.5,
      satisfactionRatingsCount: 11,
      status: 'active',
    },
  },
  {
    id: 't-mabel',
    fullName: 'Mabel Osei',
    initials: 'MO',
    email: 'mabel.osei@bid.org',
    role: 'Guest Expert',
    accessLevel: 'guest',
    specialisms: [],
    maxEntrepreneurs: 5,
    accessExpiresOn: '2025-06-30',
    calendarProvider: 'none',
    metrics: {
      entrepreneursCount: 0,
      sessionsThisMonth: 2,
      satisfactionAvg: 4.9,
      satisfactionRatingsCount: 6,
      status: 'expires-soon',
    },
  },
];

export const trainerById = (id?: string) =>
  id ? trainers.find((t) => t.id === id) : undefined;
