'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { Entrepreneur, FundingRound, Session, Deliverable } from '@/types';
import {
  currentEntrepreneur as seedEntrepreneur,
} from '@/lib/mock-data/entrepreneurs';
import { sessions as seedSessions } from '@/lib/mock-data';
import { deliverables as seedDeliverables } from '@/lib/mock-data';
import type { BookingForm, PeriodicUpdateForm, DeliverableForm, FundingRoundForm } from '@/lib/forms/schemas';

/**
 * Client-side store for the entrepreneur app.
 *
 * This is the in-memory state that backs the entrepreneur-side UI. In a
 * real backend these would be Supabase writes — the components consume
 * this context, so the swap is isolated here.
 */
interface EntrepreneurStore {
  entrepreneur: Entrepreneur;
  sessions: Session[];
  deliverables: Deliverable[];
  notifications: { id: string; title: string; meta: string }[];
  bookSession: (input: BookingForm) => void;
  submitDeliverable: (input: DeliverableForm) => void;
  addFundingRound: (input: FundingRoundForm) => void;
  submitPeriodicUpdate: (input: PeriodicUpdateForm) => void;
  requestTool: (name: string, reason: string) => void;
  updateProfile: (patch: Partial<Entrepreneur>) => void;
}

const EntrepreneurContext = React.createContext<EntrepreneurStore | null>(null);

const seedNotifications = [
  { id: 'n1', title: 'BID team reviewed your Q1 Report', meta: 'Feedback added · 2 hours ago' },
  { id: 'n2', title: 'Business Model Canvas due in 3 days', meta: 'Apr 18 · Reminder' },
  { id: 'n3', title: 'New module added to your programme', meta: 'Legal Structures for Startups' },
];

export function EntrepreneurProvider({ children }: { children: React.ReactNode }) {
  const [entrepreneur, setEntrepreneur] = React.useState<Entrepreneur>(seedEntrepreneur);
  const [sessions, setSessions] = React.useState<Session[]>(seedSessions);
  const [deliverables, setDeliverables] = React.useState<Deliverable[]>(seedDeliverables);
  const [notifications] = React.useState(seedNotifications);

  const updateProfile: EntrepreneurStore['updateProfile'] = React.useCallback((patch) => {
    setEntrepreneur((curr) => ({ ...curr, ...patch }));
    toast.success('Profile saved!');
  }, []);

  const bookSession: EntrepreneurStore['bookSession'] = React.useCallback((input) => {
    const newSession: Session = {
      id: 's-' + Date.now(),
      type: 'mentor-checkin',
      title: input.sessionType,
      trainerId: input.recipient === 'specific' ? input.trainerId : undefined,
      date: input.date,
      startTime: input.time,
      status: 'pending',
      accent: 'bid',
    };
    setSessions((curr) => [...curr, newSession]);
    toast.success('Session request sent!');
  }, []);

  const submitDeliverable: EntrepreneurStore['submitDeliverable'] = React.useCallback((input) => {
    const newDeliverable: Deliverable = {
      id: 'd-' + Date.now(),
      name: input.name,
      group: 'general',
      groupLabel: 'General deliverables',
      submittedAt: new Date().toISOString().slice(0, 10),
      notes: input.notes,
      status: 'submitted',
    };
    setDeliverables((curr) => [...curr, newDeliverable]);
    toast.success('Deliverable uploaded!');
  }, []);

  const addFundingRound: EntrepreneurStore['addFundingRound'] = React.useCallback((input) => {
    const round: FundingRound = {
      id: 'f-' + Date.now(),
      name: input.name,
      amountUsd: Number(input.amountUsd) || 0,
      date: input.date,
      source: input.source,
    };
    setEntrepreneur((curr) => ({
      ...curr,
      fundingRounds: [...curr.fundingRounds, round],
    }));
    toast.success('Funding round added!');
  }, []);

  const submitPeriodicUpdate: EntrepreneurStore['submitPeriodicUpdate'] = React.useCallback((input) => {
    setEntrepreneur((curr) => ({
      ...curr,
      lastUpdateAt: new Date().toISOString().slice(0, 10),
      metrics: {
        ...curr.metrics,
        jobsWomen: curr.metrics.jobsWomen + (Number(input.jobsWomen) || 0),
        jobsMen: curr.metrics.jobsMen + (Number(input.jobsMen) || 0),
        jobsCreated: curr.metrics.jobsCreated + (Number(input.jobsWomen) || 0) + (Number(input.jobsMen) || 0),
        fundsMobilisedUsd: curr.metrics.fundsMobilisedUsd + (Number(input.fundsMobilisedUsd) || 0),
      },
    }));
    toast.success('Update submitted!');
  }, []);

  const requestTool: EntrepreneurStore['requestTool'] = React.useCallback((name, reason) => {
    // In a real backend this would POST to a tool_requests table.
    toast.success(`Request sent to BID team${reason ? ' — ' + reason : ''}!`, {
      description: name,
    });
  }, []);

  const value = React.useMemo<EntrepreneurStore>(
    () => ({
      entrepreneur,
      sessions,
      deliverables,
      notifications,
      bookSession,
      submitDeliverable,
      addFundingRound,
      submitPeriodicUpdate,
      requestTool,
      updateProfile,
    }),
    [entrepreneur, sessions, deliverables, notifications, bookSession, submitDeliverable, addFundingRound, submitPeriodicUpdate, requestTool, updateProfile],
  );

  return (
    <EntrepreneurContext.Provider value={value}>
      {children}
    </EntrepreneurContext.Provider>
  );
}

export function useEntrepreneurStore() {
  const ctx = React.useContext(EntrepreneurContext);
  if (!ctx) throw new Error('useEntrepreneurStore must be used inside an EntrepreneurProvider');
  return ctx;
}
