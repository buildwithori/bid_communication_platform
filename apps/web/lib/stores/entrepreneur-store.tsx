'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { Entrepreneur, FundingRound, PeriodicUpdate, Session, Deliverable } from '@/types';
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
  markDeliverableFeedbackRead: (deliverableId: string, feedbackIds: string[]) => void;
  addFundingRound: (input: FundingRoundForm) => void;
  updateFundingRound: (id: string, input: FundingRoundForm) => void;
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
      type: input.sessionType as Session['type'],
      title: input.topic,
      trainerId: input.recipient === 'specific' ? input.trainerId : undefined,
      date: input.date,
      startTime: input.time,
      location: 'virtual',
      status: 'pending',
      accent: 'bid',
    };
    setSessions((curr) => [...curr, newSession]);
    toast.success('Session request sent!');
  }, []);

  const submitDeliverable: EntrepreneurStore['submitDeliverable'] = React.useCallback((input) => {
    if (input.deliverableId) {
      setDeliverables((curr) =>
        curr.map((deliverable) =>
          deliverable.id === input.deliverableId
            ? {
                ...deliverable,
                name: input.name || deliverable.name,
                fileName: input.fileName,
                fileType: inferFileType(input.fileName),
                submittedAt: new Date().toISOString().slice(0, 10),
                notes: input.notes,
                status: 'submitted',
                reviewFeedback: undefined,
              }
            : deliverable,
        ),
      );
      toast.success('Deliverable submitted for review!');
      return;
    }

    const newDeliverable: Deliverable = {
      id: 'd-' + Date.now(),
      name: input.name || 'General deliverable',
      group: 'general',
      groupLabel: 'General deliverables',
      submittedAt: new Date().toISOString().slice(0, 10),
      fileName: input.fileName,
      fileType: inferFileType(input.fileName),
      notes: input.notes,
      status: 'submitted',
    };
    setDeliverables((curr) => [...curr, newDeliverable]);
    toast.success('Deliverable uploaded!');
  }, []);

  const markDeliverableFeedbackRead: EntrepreneurStore['markDeliverableFeedbackRead'] = React.useCallback((deliverableId, feedbackIds) => {
    if (feedbackIds.length === 0) return;
    const readAt = new Date().toISOString().slice(0, 10);
    setDeliverables((curr) =>
      curr.map((deliverable) => {
        if (deliverable.id !== deliverableId || !deliverable.feedbackHistory?.length) {
          return deliverable;
        }
        return {
          ...deliverable,
          feedbackHistory: deliverable.feedbackHistory.map((feedback) =>
            feedbackIds.includes(feedback.id) && !feedback.readAt
              ? { ...feedback, readAt }
              : feedback,
          ),
        };
      }),
    );
  }, []);

  const addFundingRound: EntrepreneurStore['addFundingRound'] = React.useCallback((input) => {
    const round: FundingRound = {
      id: 'f-' + Date.now(),
      name: input.name,
      amountUsd: Number(input.amountUsd) || 0,
      date: input.date,
      source: input.source,
      programmeId: input.programmeId && input.programmeId !== 'unattributed' ? input.programmeId : undefined,
      goalId: input.goalId && input.goalId !== 'none' ? input.goalId : undefined,
    };
    setEntrepreneur((curr) => ({
      ...curr,
      fundingRounds: [...curr.fundingRounds, round],
    }));
    toast.success('Funding round added!');
  }, []);

  const updateFundingRound: EntrepreneurStore['updateFundingRound'] = React.useCallback((id, input) => {
    setEntrepreneur((curr) => ({
      ...curr,
      fundingRounds: curr.fundingRounds.map((round) =>
        round.id === id
          ? {
              ...round,
              name: input.name,
              amountUsd: Number(input.amountUsd) || 0,
              date: input.date,
              source: input.source,
              programmeId: input.programmeId && input.programmeId !== 'unattributed' ? input.programmeId : undefined,
              goalId: input.goalId && input.goalId !== 'none' ? input.goalId : undefined,
            }
          : round,
      ),
    }));
    toast.success('Funding round updated!');
  }, []);

  const submitPeriodicUpdate: EntrepreneurStore['submitPeriodicUpdate'] = React.useCallback((input) => {
    const jobsWomen = Number(input.jobsWomen) || 0;
    const jobsMen = Number(input.jobsMen) || 0;
    const submittedAt = new Date().toISOString().slice(0, 10);
    const update: PeriodicUpdate = {
      id: 'pu-' + Date.now(),
      period: formatPeriodRange(input.periodStart, input.periodEnd),
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      submittedAt,
      programmeId: input.programmeId !== 'company-wide' ? input.programmeId : undefined,
      jobsWomen,
      jobsMen,
      jobsCreated: jobsWomen + jobsMen,
      fundsMobilisedUsd: 0,
      notes: input.notes,
    };

    setEntrepreneur((curr) => ({
      ...curr,
      periodicUpdates: [update, ...(curr.periodicUpdates ?? [])],
      lastUpdateAt: submittedAt,
      metrics: {
        ...curr.metrics,
        jobsWomen: curr.metrics.jobsWomen + jobsWomen,
        jobsMen: curr.metrics.jobsMen + jobsMen,
        jobsCreated: curr.metrics.jobsCreated + update.jobsCreated,
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
      markDeliverableFeedbackRead,
      addFundingRound,
      updateFundingRound,
      submitPeriodicUpdate,
      requestTool,
      updateProfile,
    }),
    [entrepreneur, sessions, deliverables, notifications, bookSession, submitDeliverable, markDeliverableFeedbackRead, addFundingRound, updateFundingRound, submitPeriodicUpdate, requestTool, updateProfile],
  );

  return (
    <EntrepreneurContext.Provider value={value}>
      {children}
    </EntrepreneurContext.Provider>
  );
}

function formatPeriodRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

export function useEntrepreneurStore() {
  const ctx = React.useContext(EntrepreneurContext);
  if (!ctx) throw new Error('useEntrepreneurStore must be used inside an EntrepreneurProvider');
  return ctx;
}

function inferFileType(fileName: string): Deliverable['fileType'] {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'pptx' || extension === 'docx' || extension === 'xlsx') return extension;
  return 'pdf';
}
