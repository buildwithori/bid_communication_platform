/**
 * Core domain types for the BID Hub platform.
 *
 * These mirror the fields surfaced in the mockups so the mock-data layer
 * can be swapped for a real backend (e.g. Supabase tables) without
 * touching the components that consume these types.
 */

export type Role = 'entrepreneur' | 'admin';

export type SectorId =
  | 'fintech'
  | 'agritech'
  | 'healthtech'
  | 'edtech'
  | 'logistics'
  | 'construction'
  | 'renewable-energy';

export type StageId = 'idea' | 'growth' | 'scale';

export type Country = 'Ghana' | 'Nigeria' | 'Kenya';

export type EntrepreneurSource = 'invited' | 'self-registered';

export type EntrepreneurStatus = 'active' | 'unassigned' | 'graduated' | 'inactive';

export type TrainerRole =
  | 'Mentor'
  | 'Trainer'
  | 'Guest Expert'
  | 'Investment Analyst';

export type TrainerAccessLevel = 'full' | 'guest';

export type ProgramStatus = 'active' | 'completed' | 'draft';

export type ModuleStatus = 'not-started' | 'in-progress' | 'completed';

export type ContentType = 'video' | 'pdf' | 'tool';

export type ContentProgress = 'not-started' | 'in-progress' | 'completed';

export type DeliverableStatus =
  | 'pending'
  | 'submitted'
  | 'reviewed'
  | 'overdue';

export type DeliverableGroupKind =
  | 'programme'
  | 'general';

export type SessionType =
  | 'mentor-checkin'
  | 'office-hours'
  | 'investor-prep'
  | 'workshop'
  | 'deadline';

export type SessionStatus = 'confirmed' | 'pending' | 'cancelled';

export type ToolType = 'pdf' | 'embed';

export type DocumentType = 'memo' | 'report';

export type DocumentStatus = 'draft' | 'final' | 'sent';

export type GoalType = 'fundraising' | 'programme-completion' | 'milestone';

export interface Sector {
  id: SectorId;
  label: string;
  /** Tailwind badge class pair (bg, text) — kept on the entity so the
   *  rendering layer stays declarative. */
  color: BadgeTone;
}

export interface Stage {
  id: StageId;
  label: string;
  color: BadgeTone;
  definition: string;
}

export type BadgeTone =
  | 'brand'
  | 'amber'
  | 'blue'
  | 'green'
  | 'neutral'
  | 'red';

export interface Entrepreneur {
  id: string;
  businessName: string;
  representative: string;
  initials: string;
  email: string;
  phone: string;
  country: Country;
  sector: SectorId;
  stage: StageId;
  cohort?: string;
  programmeId?: string;
  source: EntrepreneurSource;
  goal: {
    type: GoalType;
    amountUsd?: number;
    description?: string;
  };
  status: EntrepreneurStatus;
  /** Aggregate metrics surfaced in the admin "View" modal & reporting. */
  metrics: {
    trainingProgress: number; // 0-100
    deliverablesDone: number;
    deliverablesTotal: number;
    jobsCreated: number;
    jobsWomen: number;
    jobsMen: number;
    fundsMobilisedUsd: number;
  };
  fundingRounds: FundingRound[];
  /** ISO date string for the most recent periodic update, or null. */
  lastUpdateAt?: string;
  trainerId?: string;
  joinedAt: string; // ISO date
}

export interface FundingRound {
  id: string;
  name: string;
  amountUsd: number;
  date: string; // ISO date
  source?: string;
}

export interface Trainer {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  role: TrainerRole;
  accessLevel: TrainerAccessLevel;
  specialisms: SectorId[];
  maxEntrepreneurs: number;
  accessExpiresOn?: string; // ISO date — only when accessLevel === 'guest'
  metrics: {
    entrepreneursCount: number;
    sessionsThisMonth: number;
    satisfactionAvg: number; // 0-5
    satisfactionRatingsCount: number;
    status: 'active' | 'expires-soon' | 'inactive';
  };
}

export interface Program {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: ProgramStatus;
  maxEntrepreneurs: number;
  description?: string;
  /** Accent color used for the left border on the card. */
  accent: 'bid' | 'info' | 'success';
  entrepreneursCount: number;
  moduleIds: string[];
  /** Calculated aggregate progress 0-100 across the programme's modules. */
  progress: number;
}

export interface Module {
  id: string;
  order: number;
  title: string;
  description?: string;
  contentItemIds: string[];
  /** How many other programmes also use this module (drives the "reuse tag"). */
  reuseCount?: number;
}

export interface ModuleWithProgress extends Module {
  status: ModuleStatus;
  progress: number; // 0-100
}

export interface ContentItem {
  id: string;
  title: string;
  chapter: string;
  type: ContentType;
  durationLabel?: string; // "9 min" for video, "Downloadable" for pdf, "Embedded" for tool
  moduleId: string;
  progress: ContentProgress;
}

export interface Deliverable {
  id: string;
  name: string;
  programmeId?: string; // undefined when group === 'general'
  group: DeliverableGroupKind;
  groupLabel: string;
  dueDate?: string; // ISO date
  submittedAt?: string; // ISO date
  fileName?: string;
  fileType?: 'pdf' | 'pptx' | 'docx' | 'xlsx';
  notes?: string;
  reviewFeedback?: string;
  status: DeliverableStatus;
}

export interface DeliverableGroup {
  id: string;
  label: string;
  programmeId?: string;
  accent: 'bid' | 'info' | 'success';
  pendingCount: number;
  doneCount: number;
}

export interface Session {
  id: string;
  type: SessionType;
  title: string;
  trainerId?: string;
  date: string; // ISO date
  startTime?: string; // "10:00"
  endTime?: string; // "10:45"
  location?: 'virtual' | 'in-person';
  status: SessionStatus;
  accent: 'bid' | 'info' | 'success' | 'warning' | 'neutral';
  isDeadline?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  /** Icon key used by the rendering layer. */
  iconKey: 'canvas' | 'document' | 'timer' | 'star' | 'plus' | 'calendar';
}

export interface PlatformDocument {
  id: string;
  title: string;
  type: DocumentType;
  entrepreneurId?: string;
  cohort?: string;
  generatedAt: string; // ISO date
  status: DocumentStatus;
}

export interface ActivityEntry {
  id: string;
  text: string;
  /** Highlighted portion of `text` rendered bold. */
  emphasis?: string;
  timestamp: string; // human readable ("2h ago")
  accent: 'bid' | 'info' | 'warning' | 'neutral';
}

export interface PendingAction {
  id: string;
  label: string;
  count: number;
  tone: BadgeTone;
}

export interface ReportingMetrics {
  jobsCreated: number;
  jobsWomen: number;
  jobsMen: number;
  fundsMobilisedUsd: number;
  entrepreneursWithFunds: number;
  updateSubmissionRate: number; // 0-100
  trainingCompletionRate: number; // 0-100
  totalEntrepreneurs: number;
  submittedUpdatesThisQuarter: number;
}

export interface ProgramBreakdownRow {
  programName: string;
  value: number;
  label: string; // formatted value e.g. "$150k", "38"
  accent: 'bid' | 'info' | 'success';
  percent: number; // 0-100 bar width
}
