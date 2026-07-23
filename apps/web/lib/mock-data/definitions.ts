import type {
  Sector,
  Stage,
  SectorId,
  StageId,
} from '@/types';

/**
 * Seed sectors and business stages.
 *
 * In a real backend these would be lookup tables referenced by
 * `entrepreneurs.sector_id` / `entrepreneurs.stage_id`. The UI reads
 * them through `lib/mock-data` so swapping the source later is a one-file change.
 */

export const sectors: Sector[] = [
  { id: 'fintech', label: 'Fintech', color: 'blue' },
  { id: 'agritech', label: 'Agritech', color: 'green' },
  { id: 'healthtech', label: 'Healthtech', color: 'brand' },
  { id: 'edtech', label: 'Edtech', color: 'amber' },
  { id: 'logistics', label: 'Logistics', color: 'neutral' },
  { id: 'construction', label: 'Construction', color: 'neutral' },
  { id: 'renewable-energy', label: 'Renewable Energy', color: 'green' },
];

export const stages: Stage[] = [
  {
    id: 'idea',
    label: 'Idea',
    color: 'amber',
    definition:
      'Early concept stage — pre-revenue, validating problem/solution fit.',
  },
  {
    id: 'growth',
    label: 'Growth',
    color: 'brand',
    definition:
      'Business has validated revenue and is actively scaling operations.',
  },
  {
    id: 'scale',
    label: 'Scale',
    color: 'blue',
    definition:
      'Established business expanding into new markets, products or team size.',
  },
];

export const sectorById: Record<SectorId, Sector> = sectors.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<SectorId, Sector>,
);

export const stageById: Record<StageId, Stage> = stages.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<StageId, Stage>,
);

export interface ProgrammeGoalType {
  id: string;
  label: string;
  description: string;
  requiresTargetAmount: boolean;
  active: boolean;
}

export const programmeGoalTypes: ProgrammeGoalType[] = [
  {
    id: 'fundraising',
    label: 'Fundraising target',
    description: 'Track capital the entrepreneur intends to raise for a programme.',
    requiresTargetAmount: true,
    active: true,
  },
  {
    id: 'programme-completion',
    label: 'Programme completion',
    description: 'Track completion of the assigned programme requirements.',
    requiresTargetAmount: false,
    active: true,
  },
  {
    id: 'milestone',
    label: 'Milestone-based',
    description: 'Track a business milestone agreed with BID or the programme team.',
    requiresTargetAmount: false,
    active: true,
  },
];
