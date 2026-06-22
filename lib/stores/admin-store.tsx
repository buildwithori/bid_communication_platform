'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type {
  Entrepreneur,
  Trainer,
  Program,
  Module,
  ContentItem,
  PlatformDocument,
  Sector,
  Stage,
  SectorId,
} from '@/types';
import {
  entrepreneurs as seedEntrepreneurs,
} from '@/lib/mock-data/entrepreneurs';
import { trainers as seedTrainers } from '@/lib/mock-data/trainers';
import { programs as seedPrograms, modules as seedModules, contentItems as seedContent } from '@/lib/mock-data/programs';
import { platformDocuments as seedDocs } from '@/lib/mock-data';
import { sectors as seedSectors, stages as seedStages } from '@/lib/mock-data/definitions';
import type {
  EntrepreneurForm,
  TrainerForm,
  ProgramForm,
  AssignToProgramForm,
} from '@/lib/forms/schemas';

/**
 * Admin-side in-memory store. Mirrors what a Supabase backend would
 * own: entrepreneurs, trainers, programmes + modules, content items,
 * documents, and the sector / stage lookup tables. All mutations
 * happen through this context so the UI stays decoupled from the
 * data source.
 */
interface AdminStore {
  entrepreneurs: Entrepreneur[];
  trainers: Trainer[];
  programs: Program[];
  modules: Module[];
  contentItems: ContentItem[];
  documents: PlatformDocument[];
  sectors: Sector[];
  stages: Stage[];
  addEntrepreneur: (input: EntrepreneurForm) => void;
  updateEntrepreneur: (id: string, patch: Partial<Entrepreneur>) => void;
  assignEntrepreneur: (input: AssignToProgramForm) => void;
  addTrainer: (input: TrainerForm) => void;
  updateTrainer: (id: string, patch: Partial<Trainer>) => void;
  addProgram: (input: ProgramForm) => void;
  updateProgram: (id: string, patch: Partial<Program>) => void;
  addModule: (programId: string, title: string, description?: string) => void;
  addContentItem: (moduleId: string, title: string, type: ContentItem['type']) => void;
  addSector: (label: string) => void;
  removeSector: (id: string) => void;
  updateStageDefinitions: (defs: Record<string, string>) => void;
  generateDocument: (input: { title: string; type: 'memo' | 'report'; entrepreneurId?: string; cohort?: string }) => void;
}

const AdminContext = React.createContext<AdminStore | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

const sectorByLabel = (label: string, sectors: Sector[]): SectorId | undefined =>
  sectors.find((s) => s.label.toLowerCase() === label.toLowerCase())?.id;

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [entrepreneurs, setEntrepreneurs] = React.useState<Entrepreneur[]>(seedEntrepreneurs);
  const [trainers, setTrainers] = React.useState<Trainer[]>(seedTrainers);
  const [programs, setPrograms] = React.useState<Program[]>(seedPrograms);
  const [modules, setModules] = React.useState<Module[]>(seedModules);
  const [contentItems, setContentItems] = React.useState<ContentItem[]>(seedContent);
  const [documents, setDocuments] = React.useState<PlatformDocument[]>(seedDocs);
  const [sectors, setSectors] = React.useState<Sector[]>(seedSectors);
  const [stages, setStages] = React.useState<Stage[]>(seedStages);

  const addEntrepreneur: AdminStore['addEntrepreneur'] = React.useCallback((input) => {
    const id = makeId('e');
    const newEnt: Entrepreneur = {
      id,
      businessName: input.businessName,
      representative: input.representative,
      initials: initialsFrom(input.representative) || input.businessName.slice(0, 2).toUpperCase(),
      email: input.email,
      phone: input.phone ?? '',
      country: input.country,
      sector: (sectorByLabel(input.sector, seedSectors) ?? 'fintech') as SectorId,
      stage: input.stage,
      source: 'invited',
      goal: {
        type: input.goalType,
        amountUsd: input.goalAmountUsd ? Number(input.goalAmountUsd) : undefined,
        description: input.goalType === 'fundraising' ? 'Fundraising target' : undefined,
      },
      status: input.programmeId && input.programmeId !== 'none' ? 'active' : 'unassigned',
      programmeId: input.programmeId && input.programmeId !== 'none' ? input.programmeId : undefined,
      trainerId: input.trainerId && input.trainerId !== 'none' ? input.trainerId : undefined,
      metrics: {
        trainingProgress: 0,
        deliverablesDone: 0,
        deliverablesTotal: 0,
        jobsCreated: 0,
        jobsWomen: 0,
        jobsMen: 0,
        fundsMobilisedUsd: 0,
      },
      fundingRounds: [],
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    setEntrepreneurs((curr) => [newEnt, ...curr]);
    toast.success('Entrepreneur added!');
  }, []);

  const updateEntrepreneur: AdminStore['updateEntrepreneur'] = React.useCallback((id, patch) => {
    setEntrepreneurs((curr) =>
      curr.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
    toast.success('Profile updated!');
  }, []);

  const assignEntrepreneur: AdminStore['assignEntrepreneur'] = React.useCallback((input) => {
    setEntrepreneurs((curr) =>
      curr.map((e) =>
        e.id === input.entrepreneurId
          ? {
              ...e,
              programmeId: input.programmeId,
              trainerId: input.trainerId && input.trainerId !== 'none' ? input.trainerId : e.trainerId,
              status: 'active',
            }
          : e,
      ),
    );
    toast.success('Entrepreneur assigned!');
  }, []);

  const addTrainer: AdminStore['addTrainer'] = React.useCallback((input) => {
    const id = makeId('t');
    const fullName = `${input.firstName} ${input.lastName}`;
    const newTrainer: Trainer = {
      id,
      fullName,
      initials: initialsFrom(fullName),
      email: input.email,
      role: input.role,
      accessLevel: input.accessLevel,
      specialisms: (input.specialisms ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => sectorByLabel(label, seedSectors))
        .filter(Boolean) as SectorId[],
      maxEntrepreneurs: input.maxEntrepreneurs ? Number(input.maxEntrepreneurs) : 10,
      accessExpiresOn: input.accessLevel === 'guest' ? input.accessExpiresOn : undefined,
      metrics: {
        entrepreneursCount: 0,
        sessionsThisMonth: 0,
        satisfactionAvg: 0,
        satisfactionRatingsCount: 0,
        status: 'active',
      },
    };
    setTrainers((curr) => [newTrainer, ...curr]);
    toast.success('Trainer added!');
  }, []);

  const updateTrainer: AdminStore['updateTrainer'] = React.useCallback((id, patch) => {
    setTrainers((curr) =>
      curr.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
    toast.success('Trainer updated!');
  }, []);

  const addProgram: AdminStore['addProgram'] = React.useCallback((input) => {
    const id = makeId('p');
    const newProg: Program = {
      id,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'active',
      maxEntrepreneurs: Number(input.maxEntrepreneurs) || 20,
      description: input.description,
      accent: 'bid',
      entrepreneursCount: 0,
      moduleIds: [],
      progress: 0,
    };
    setPrograms((curr) => [newProg, ...curr]);
    toast.success('Program created! Add modules from the Programs page.');
  }, []);

  const updateProgram: AdminStore['updateProgram'] = React.useCallback((id, patch) => {
    setPrograms((curr) =>
      curr.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
    toast.success('Programme updated!');
  }, []);

  const addModule: AdminStore['addModule'] = React.useCallback((programId, title, description) => {
    const id = makeId('m');
    const program = programs.find((p) => p.id === programId);
    const order = program ? program.moduleIds.length + 1 : 1;
    const newModule: Module = {
      id,
      order,
      title,
      description,
      contentItemIds: [],
    };
    setModules((curr) => [...curr, newModule]);
    setPrograms((curr) =>
      curr.map((p) =>
        p.id === programId ? { ...p, moduleIds: [...p.moduleIds, id] } : p,
      ),
    );
    toast.success('Module created! Add content next.');
  }, [programs]);

  const addContentItem: AdminStore['addContentItem'] = React.useCallback((moduleId, title, type) => {
    const id = makeId('c');
    const newItem: ContentItem = {
      id,
      title,
      chapter: 'Chapter 1',
      type,
      durationLabel:
        type === 'video' ? '10 min' : type === 'pdf' ? 'Downloadable' : 'Embedded tool',
      moduleId,
      progress: 'not-started',
    };
    setContentItems((curr) => [...curr, newItem]);
    setModules((curr) =>
      curr.map((m) =>
        m.id === moduleId ? { ...m, contentItemIds: [...m.contentItemIds, id] } : m,
      ),
    );
    toast.success('Content item added!');
  }, []);

  const addSector: AdminStore['addSector'] = React.useCallback((label) => {
    const id = label.toLowerCase().replace(/\s+/g, '-') as SectorId;
    setSectors((curr) => [...curr, { id, label, color: 'neutral' }]);
    toast.success('Sector added!');
  }, []);

  const removeSector: AdminStore['removeSector'] = React.useCallback((id) => {
    setSectors((curr) => curr.filter((s) => s.id !== id));
    toast.success('Sector removed!');
  }, []);

  const updateStageDefinitions: AdminStore['updateStageDefinitions'] = React.useCallback((defs) => {
    setStages((curr) =>
      curr.map((s) => ({ ...s, definition: defs[s.id] ?? s.definition })),
    );
    toast.success('Stage definitions updated!');
  }, []);

  const generateDocument: AdminStore['generateDocument'] = React.useCallback((input) => {
    const id = makeId('doc');
    const doc: PlatformDocument = {
      id,
      title: input.title,
      type: input.type,
      entrepreneurId: input.entrepreneurId,
      cohort: input.cohort,
      generatedAt: new Date().toISOString().slice(0, 10),
      status: 'draft',
    };
    setDocuments((curr) => [doc, ...curr]);
    toast.success(
      input.type === 'memo'
        ? 'Memo generated from template — opening for edits…'
        : 'Progress report generated!',
    );
  }, []);

  const value = React.useMemo<AdminStore>(
    () => ({
      entrepreneurs,
      trainers,
      programs,
      modules,
      contentItems,
      documents,
      sectors,
      stages,
      addEntrepreneur,
      updateEntrepreneur,
      assignEntrepreneur,
      addTrainer,
      updateTrainer,
      addProgram,
      updateProgram,
      addModule,
      addContentItem,
      addSector,
      removeSector,
      updateStageDefinitions,
      generateDocument,
    }),
    [entrepreneurs, trainers, programs, modules, contentItems, documents, sectors, stages, addEntrepreneur, updateEntrepreneur, assignEntrepreneur, addTrainer, updateTrainer, addProgram, updateProgram, addModule, addContentItem, addSector, removeSector, updateStageDefinitions, generateDocument],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdminStore() {
  const ctx = React.useContext(AdminContext);
  if (!ctx) throw new Error('useAdminStore must be used inside an AdminProvider');
  return ctx;
}
