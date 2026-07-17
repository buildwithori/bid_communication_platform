'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type {
  Entrepreneur,
  Trainer,
  Program,
  Module,
  ContentItem,
  Sector,
  Stage,
  SectorId,
} from '@/types';
import {
  entrepreneurs as seedEntrepreneurs,
} from '@/lib/mock-data/entrepreneurs';
import { trainers as seedTrainers } from '@/lib/mock-data/trainers';
import { programs as seedPrograms, modules as seedModules, contentItems as seedContent } from '@/lib/mock-data/programs';
import { toolById } from '@/lib/mock-data';
import { programmeGoalTypes, sectors as seedSectors, stages as seedStages } from '@/lib/mock-data/definitions';
import type {
  EntrepreneurForm,
  ProgramForm,
  AssignToProgramForm,
  ContentItemForm,
} from '@/lib/forms/schemas';

/**
 * Admin-side in-memory store. Mirrors what a Supabase backend would
 * own: entrepreneurs, trainers, programmes + modules, content items,
 * and the sector / stage lookup tables. All mutations
 * happen through this context so the UI stays decoupled from the
 * data source.
 */
interface AdminStore {
  entrepreneurs: Entrepreneur[];
  trainers: Trainer[];
  programs: Program[];
  modules: Module[];
  contentItems: ContentItem[];
  sectors: Sector[];
  stages: Stage[];
  addEntrepreneur: (input: EntrepreneurForm) => void;
  updateEntrepreneur: (id: string, patch: Partial<Entrepreneur>) => void;
  assignEntrepreneur: (input: AssignToProgramForm) => void;
  removeProgrammeEnrollment: (entrepreneurId: string, programmeId: string) => void;
  updateTrainer: (id: string, patch: Partial<Trainer>) => void;
  addProgram: (input: ProgramForm) => void;
  updateProgram: (id: string, patch: Partial<Program>) => void;
  addModule: (programId: string, title: string, description?: string) => void;
  addExistingModuleToProgram: (programId: string, moduleId: string) => void;
  reorderProgramModule: (programId: string, activeModuleId: string, overModuleId: string) => void;
  moveProgramModule: (programId: string, moduleId: string, direction: 'up' | 'down') => void;
  moveProgramModuleToPosition: (programId: string, moduleId: string, position: number) => void;
  reorderModuleContent: (moduleId: string, activeContentId: string, overContentId: string) => void;
  addContentItem: (moduleId: string, input: ContentItemForm) => void;
  addSector: (label: string) => void;
  updateSector: (id: string, label: string) => void;
  removeSector: (id: string) => void;
  addStage: (label: string, definition: string) => void;
  updateStage: (id: string, patch: Partial<Stage>) => void;
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

const goalTypeDescription = (id: string) =>
  programmeGoalTypes.find((goalType) => goalType.id === id)?.label;

function contentIdsForProgramme(programmeId: string, programmes: Program[], contentItems: ContentItem[]) {
  const programme = programmes.find((item) => item.id === programmeId);
  if (!programme) return [];
  const moduleIds = new Set(programme.moduleIds);
  return contentItems
    .filter((item) => moduleIds.has(item.moduleId))
    .map((item) => item.id);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [entrepreneurs, setEntrepreneurs] = React.useState<Entrepreneur[]>(seedEntrepreneurs);
  const [trainers, setTrainers] = React.useState<Trainer[]>(seedTrainers);
  const [programs, setPrograms] = React.useState<Program[]>(seedPrograms);
  const [modules, setModules] = React.useState<Module[]>(seedModules);
  const [contentItems, setContentItems] = React.useState<ContentItem[]>(seedContent);
  const [sectors, setSectors] = React.useState<Sector[]>(seedSectors);
  const [stages, setStages] = React.useState<Stage[]>(seedStages);

  const addEntrepreneur: AdminStore['addEntrepreneur'] = React.useCallback((input) => {
    const id = makeId('e');
    const selectedProgrammeId = input.programmeId && input.programmeId !== 'none' ? input.programmeId : undefined;
    const initialContentItemIds = selectedProgrammeId
      ? contentIdsForProgramme(selectedProgrammeId, programs, contentItems)
      : [];
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
        description: goalTypeDescription(input.goalType),
      },
      status: selectedProgrammeId ? 'active' : 'unassigned',
      contentItemIds: initialContentItemIds,
      programmeIds: selectedProgrammeId ? [selectedProgrammeId] : [],
      programmeId: selectedProgrammeId,
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
  }, [contentItems, programs]);

  const updateEntrepreneur: AdminStore['updateEntrepreneur'] = React.useCallback((id, patch) => {
    setEntrepreneurs((curr) =>
      curr.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
    toast.success('Profile updated!');
  }, []);

  const assignEntrepreneur: AdminStore['assignEntrepreneur'] = React.useCallback((input) => {
    const grantedContentIds = contentIdsForProgramme(input.programmeId, programs, contentItems);
    setEntrepreneurs((curr) =>
      curr.map((e) =>
        e.id === input.entrepreneurId
          ? {
              ...e,
              contentItemIds: Array.from(new Set([...(e.contentItemIds ?? []), ...grantedContentIds])),
              programmeIds: Array.from(new Set([...(e.programmeIds ?? []), ...(e.programmeId ? [e.programmeId] : []), input.programmeId])),
              programmeId: e.programmeId ?? input.programmeId,
              status: 'active',
            }
          : e,
      ),
    );
    toast.success('Programme added');
  }, [contentItems, programs]);

  const removeProgrammeEnrollment: AdminStore['removeProgrammeEnrollment'] = React.useCallback((entrepreneurId, programmeId) => {
    setEntrepreneurs((curr) =>
      curr.map((e) => {
        if (e.id !== entrepreneurId) return e;

        const remainingProgrammeIds = Array.from(
          new Set([...(e.programmeIds ?? []), ...(e.programmeId ? [e.programmeId] : [])]),
        ).filter((id) => id !== programmeId);
        const removedContentIds = new Set(contentIdsForProgramme(programmeId, programs, contentItems));
        const remainingContentItemIds = (e.contentItemIds ?? []).filter((id) => !removedContentIds.has(id));
        const nextStatus =
          remainingContentItemIds.length === 0 && e.status === 'active'
            ? 'unassigned'
            : e.status;

        return {
          ...e,
          contentItemIds: remainingContentItemIds,
          programmeIds: remainingProgrammeIds,
          programmeId: remainingProgrammeIds[0],
          status: nextStatus,
        };
      }),
    );
    toast.success('Programme removed');
  }, [contentItems, programs]);

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
      accessType: input.accessType,
      startDate: input.startDate,
      endDate: input.endDate,
      publishedAt: input.publishState === 'published' ? new Date().toISOString() : undefined,
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

  const addExistingModuleToProgram: AdminStore['addExistingModuleToProgram'] = React.useCallback((programId, moduleId) => {
    const existingModule = modules.find((item) => item.id === moduleId);

    setPrograms((curr) =>
      curr.map((p) => {
        if (p.id !== programId || p.moduleIds.includes(moduleId)) return p;
        return { ...p, moduleIds: [...p.moduleIds, moduleId] };
      }),
    );
    setModules((curr) =>
      curr.map((item) =>
        item.id === moduleId
          ? { ...item, reuseCount: Math.max(item.reuseCount ?? 1, 1) + 1 }
          : item,
      ),
    );
    toast.success(existingModule ? `${existingModule.title} added to programme` : 'Module added to programme');
  }, [modules]);

  const reorderProgramModule: AdminStore['reorderProgramModule'] = React.useCallback((programId, activeModuleId, overModuleId) => {
    if (activeModuleId === overModuleId) return;

    setPrograms((curr) =>
      curr.map((program) => {
        if (program.id !== programId) return program;
        const nextModuleIds = [...program.moduleIds];
        const activeIndex = nextModuleIds.indexOf(activeModuleId);
        const overIndex = nextModuleIds.indexOf(overModuleId);
        if (activeIndex < 0 || overIndex < 0) return program;

        nextModuleIds.splice(activeIndex, 1);
        const overIndexAfterRemoval = nextModuleIds.indexOf(overModuleId);
        const insertIndex = activeIndex < overIndex ? overIndexAfterRemoval + 1 : overIndexAfterRemoval;
        nextModuleIds.splice(insertIndex, 0, activeModuleId);
        return { ...program, moduleIds: nextModuleIds };
      }),
    );
    toast.success('Module order updated');
  }, []);

  const moveProgramModule: AdminStore['moveProgramModule'] = React.useCallback((programId, moduleId, direction) => {
    setPrograms((curr) =>
      curr.map((program) => {
        if (program.id !== programId) return program;
        const nextModuleIds = [...program.moduleIds];
        const currentIndex = nextModuleIds.indexOf(moduleId);
        const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= nextModuleIds.length) return program;

        [nextModuleIds[currentIndex], nextModuleIds[nextIndex]] = [nextModuleIds[nextIndex], nextModuleIds[currentIndex]];
        return { ...program, moduleIds: nextModuleIds };
      }),
    );
    toast.success('Module order updated');
  }, []);

  const moveProgramModuleToPosition: AdminStore['moveProgramModuleToPosition'] = React.useCallback((programId, moduleId, position) => {
    setPrograms((curr) =>
      curr.map((program) => {
        if (program.id !== programId) return program;
        const nextModuleIds = [...program.moduleIds];
        const currentIndex = nextModuleIds.indexOf(moduleId);
        if (currentIndex < 0) return program;

        const targetIndex = Math.min(Math.max(position - 1, 0), nextModuleIds.length - 1);
        nextModuleIds.splice(currentIndex, 1);
        nextModuleIds.splice(targetIndex, 0, moduleId);
        return { ...program, moduleIds: nextModuleIds };
      }),
    );
    toast.success(`Module moved to position ${position}`);
  }, []);

  const addContentItem: AdminStore['addContentItem'] = React.useCallback((moduleId, input) => {
    const id = makeId('c');
    const newItem: ContentItem = {
      id,
      title: input.title,
      chapter: 'Chapter 1',
      type: input.type,
      durationLabel:
        input.type === 'video' ? '10 min' : input.type === 'pdf' ? 'Downloadable' : 'Embedded tool',
      moduleId,
      trainerId: input.trainerId,
      muxPlaybackId: input.type === 'video' ? 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe' : undefined,
      pdfFileName: input.type === 'pdf' ? input.pdfFileName?.trim() : undefined,
      fileUrl: input.type === 'pdf' ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : undefined,
      linkedToolId: input.type === 'tool' && input.toolSource === 'library' ? input.linkedToolId : undefined,
      toolUrl:
        input.type === 'tool'
          ? input.toolSource === 'library'
            ? toolById(input.linkedToolId ?? '')?.embedUrl
            : input.toolUrl?.trim()
          : undefined,
      progress: 'not-started',
    };
    setContentItems((curr) => [...curr, newItem]);
    setModules((curr) =>
      curr.map((m) =>
        m.id === moduleId ? { ...m, contentItemIds: [...m.contentItemIds, id] } : m,
      ),
    );
    toast.success('Content item added with trainer ownership');
  }, []);

  const reorderModuleContent: AdminStore['reorderModuleContent'] = React.useCallback((moduleId, activeContentId, overContentId) => {
    if (activeContentId === overContentId) return;

    setModules((curr) =>
      curr.map((module) => {
        if (module.id !== moduleId) return module;
        const nextContentItemIds = [...module.contentItemIds];
        const activeIndex = nextContentItemIds.indexOf(activeContentId);
        const overIndex = nextContentItemIds.indexOf(overContentId);
        if (activeIndex < 0 || overIndex < 0) return module;

        nextContentItemIds.splice(activeIndex, 1);
        const overIndexAfterRemoval = nextContentItemIds.indexOf(overContentId);
        const insertIndex = activeIndex < overIndex ? overIndexAfterRemoval + 1 : overIndexAfterRemoval;
        nextContentItemIds.splice(insertIndex, 0, activeContentId);
        return { ...module, contentItemIds: nextContentItemIds };
      }),
    );
    toast.success('Content order updated');
  }, []);

  const addSector: AdminStore['addSector'] = React.useCallback((label) => {
    const id = label.toLowerCase().replace(/\s+/g, '-') as SectorId;
    setSectors((curr) => [...curr, { id, label, color: 'neutral' }]);
    toast.success('Sector added!');
  }, []);

  const updateSector: AdminStore['updateSector'] = React.useCallback((id, label) => {
    setSectors((curr) =>
      curr.map((sector) => (sector.id === id ? { ...sector, label } : sector)),
    );
    toast.success('Sector updated!');
  }, []);

  const removeSector: AdminStore['removeSector'] = React.useCallback((id) => {
    setSectors((curr) => curr.filter((s) => s.id !== id));
    toast.success('Sector removed!');
  }, []);

  const addStage: AdminStore['addStage'] = React.useCallback((label, definition) => {
    const id = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setStages((curr) => [...curr, { id, label, definition, color: 'neutral' }]);
    toast.success('Stage added!');
  }, []);

  const updateStage: AdminStore['updateStage'] = React.useCallback((id, patch) => {
    setStages((curr) =>
      curr.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
    );
    toast.success('Stage updated!');
  }, []);

  const value = React.useMemo<AdminStore>(
    () => ({
      entrepreneurs,
      trainers,
      programs,
      modules,
      contentItems,
      sectors,
      stages,
      addEntrepreneur,
      updateEntrepreneur,
      assignEntrepreneur,
      removeProgrammeEnrollment,
      updateTrainer,
      addProgram,
      updateProgram,
      addModule,
      addExistingModuleToProgram,
      reorderProgramModule,
      moveProgramModule,
      moveProgramModuleToPosition,
      reorderModuleContent,
      addContentItem,
      addSector,
      updateSector,
      removeSector,
      addStage,
      updateStage,
    }),
    [entrepreneurs, trainers, programs, modules, contentItems, sectors, stages, addEntrepreneur, updateEntrepreneur, assignEntrepreneur, removeProgrammeEnrollment, updateTrainer, addProgram, updateProgram, addModule, addExistingModuleToProgram, reorderProgramModule, moveProgramModule, moveProgramModuleToPosition, reorderModuleContent, addContentItem, addSector, updateSector, removeSector, addStage, updateStage],
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
