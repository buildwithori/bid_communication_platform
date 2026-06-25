/**
 * Mock auth configuration for BID Hub.
 *
 * In production this would be replaced with Supabase Auth. The session is
 * stored in a signed cookie; the JWT payload drives all middleware decisions.
 *
 * Test credentials:
 *   entrepreneur   demo@entrepreneur.bid / demo1234
 *   admin          admin@bid.org         / admin1234
 *   trainer        trainer@bid.org       / trainer1234
 *   pending        pending@bid.org       / pending1234  (status = pending)
 */

import type { Role } from '@/types';

export type AccountStatus = 'active' | 'pending' | 'suspended';

export interface BidSession {
  userId: string;
  email: string;
  name: string;
  role: Role;
  status: AccountStatus;
  /** Entrepreneur only */
  businessId?: string;
  /** Admin / trainer only */
  staffId?: string;
  /** Trainer only — list of assigned entrepreneur IDs */
  assignedEntrepreneurIds?: string[];
}

interface MockAccount {
  email: string;
  password: string;
  session: BidSession;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: 'demo@entrepreneur.bid',
    password: 'demo1234',
    session: {
      userId: 'usr_ent_01',
      email: 'demo@entrepreneur.bid',
      name: 'Mariam Okonkwo',
      role: 'entrepreneur',
      status: 'active',
      businessId: 'biz_01',
    },
  },
  {
    email: 'pending@bid.org',
    password: 'pending1234',
    session: {
      userId: 'usr_ent_02',
      email: 'pending@bid.org',
      name: 'Kofi Mensah',
      role: 'entrepreneur',
      status: 'pending',
      businessId: 'biz_02',
    },
  },
  {
    email: 'admin@bid.org',
    password: 'admin1234',
    session: {
      userId: 'usr_adm_01',
      email: 'admin@bid.org',
      name: 'Ama Darko',
      role: 'admin',
      status: 'active',
      staffId: 'staff_01',
    },
  },
  {
    email: 'trainer@bid.org',
    password: 'trainer1234',
    session: {
      userId: 'usr_trn_01',
      email: 'trainer@bid.org',
      name: 'Kwame Asante',
      role: 'trainer',
      status: 'active',
      staffId: 'staff_02',
      assignedEntrepreneurIds: ['ent_01', 'ent_02'],
    },
  },
];

export const SESSION_COOKIE = 'bid_session';

/** Simple encode — NOT cryptographically signed. Replace with JWT in production. */
export function encodeSession(session: BidSession): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(session))));
}

export function decodeSession(value: string): BidSession | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value)))) as BidSession;
  } catch {
    return null;
  }
}

export function authenticate(email: string, password: string): BidSession | null {
  const account = MOCK_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password,
  );
  return account?.session ?? null;
}
