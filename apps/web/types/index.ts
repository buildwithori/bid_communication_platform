/**
 * Core domain types for the BID Hub platform.
 *
 * These mirror the fields surfaced in the mockups so the mock-data layer
 * can be swapped for a real backend (e.g. Supabase tables) without
 * touching the components that consume these types.
 */

export type Role = 'entrepreneur' | 'admin' | 'trainer';

export type SectorId =
  | 'fintech'
  | 'agritech'
  | 'healthtech'
  | 'edtech'
  | 'logistics'
  | 'construction'
  | 'renewable-energy';

export type StageId = string;

export type Country = 'Ghana' | 'Nigeria' | 'Kenya' | 'Rwanda';

export type EntrepreneurSource = 'invited' | 'self-registered';

export type EntrepreneurStatus = 'active' | 'unassigned' | 'graduated' | 'inactive';

export type TrainerRole =
  | 'Mentor'
  | 'Trainer'
  | 'Guest Expert'
  | 'Investment Analyst';

export type TrainerAccessLevel = 'full' | 'guest';

export type ProgramStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
export type ProgramAccessType = 'assigned' | 'free';

export type ModuleStatus = 'not-started' | 'in-progress' | 'completed';

export type ContentType = 'video' | 'pdf' | 'tool';

export type ContentProgress = 'not-started' | 'in-progress' | 'completed';

export type DeliverableStatus =
  | 'pending'
  | 'submitted'
  | 'changes-requested'
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
export type MeetingProvider = 'google-meet' | 'zoom' | 'teams' | 'custom';

export type ToolType = 'pdf' | 'embed';
export type ToolVisibility = 'all-entrepreneurs' | 'programmes' | 'entrepreneurs';
export type ToolStatus = 'draft' | 'published' | 'archived';

export type GoalType = string;

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
  /** Learning content the entrepreneur can access. Programme access is inferred from these content items. */
  contentItemIds?: string[];
  /** Legacy programme enrolments. New UI should infer programme access from contentItemIds. */
  programmeIds?: string[];
  /** Legacy programme pointer; use programmeIds for the full enrolment list. */
  programmeId?: string;
  /** Individual tool access exceptions. Global and programme rules still remain the default source of access. */
  toolAccess?: {
    addedToolIds?: string[];
    blockedToolIds?: string[];
  };
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
  periodicUpdates?: PeriodicUpdate[];
  /** ISO date string for the most recent periodic update, or null. */
  lastUpdateAt?: string;
  /** Legacy only. Trainer scope is inferred from the trainers attached to accessible content. */
  trainerId?: string;
  joinedAt: string; // ISO date
}

export interface FundingRound {
  id: string;
  name: string;
  amountUsd: number;
  date: string; // ISO date
  source?: string;
  /** Programme this round should count toward in reporting. Empty means company-wide/unattributed. */
  programmeId?: string;
  goalId?: string;
}

export interface PeriodicUpdate {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  submittedAt: string; // ISO date
  /** Programme this update should count toward in reporting. Empty means company-wide/unattributed. */
  programmeId?: string;
  jobsWomen: number;
  jobsMen: number;
  jobsCreated: number;
  fundsMobilisedUsd: number;
  notes?: string;
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
  calendarProvider?: 'google' | 'calendly' | 'none';
  calendarLink?: string;
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
  /** Free programmes are available to every entrepreneur; assigned programmes require enrolment. */
  accessType: ProgramAccessType;
  startDate: string; // ISO date
  endDate: string; // ISO date
  /** Programmes are drafts until published; status is derived from this and the date window. */
  publishedAt?: string;
  /** Archive wins over every other displayed status. Completion is derived from the programme end date. */
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  /** Legacy snapshot/fallback only. Use getProgrammeStatus for display logic. */
  status?: ProgramStatus;
  maxEntrepreneurs: number;
  description?: string;
  /** Accent color used for the left border on the card. */
  accent: 'bid' | 'info' | 'success';
  /** Number of entrepreneurs currently active/enrolled in the programme. */
  entrepreneursCount: number;
  moduleIds: string[];
  /** Entrepreneurs who left the programme before completing it. */
  leftEntrepreneursCount?: number;
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
  /** Trainer/content owner. Ratings for this content are attributed to this trainer. */
  trainerId?: string;
  /** Mux public playback ID used by video content. */
  muxPlaybackId?: string;
  /** URL for PDF/file content that can be rendered in the browser. */
  fileUrl?: string;
  /** Original uploaded PDF file name shown in admin/customer UI before storage is connected. */
  pdfFileName?: string;
  /** Linked entrepreneur tool when this content item reuses the tool library. */
  linkedToolId?: string;
  /** External URL for embedded browser tools. */
  toolUrl?: string;
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
  feedbackHistory?: DeliverableFeedback[];
  reviewer?: string;
  status: DeliverableStatus;
}

export interface DeliverableFeedback {
  id: string;
  message: string;
  reviewer: string;
  createdAt: string;
  readAt?: string;
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
  meetingProvider?: MeetingProvider;
  meetingUrl?: string;
  status: SessionStatus;
  accent: 'bid' | 'info' | 'success' | 'warning' | 'neutral';
  isDeadline?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  /** Admin-managed taxonomy used for filtering, requests, and reporting. */
  toolArea?: string;
  /** Backend lookup id for the selected tool area. */
  toolAreaId?: string;
  /** Published tools appear in entrepreneur workspaces; drafts stay admin-only. */
  status?: ToolStatus;
  /** Controls who can see the tool in the entrepreneur workspace. */
  visibility?: ToolVisibility;
  /** Programmes that can see this tool when visibility === 'programmes'. */
  programmeIds?: string[];
  /** Individual entrepreneurs that can see this tool when visibility === 'entrepreneurs'. */
  entrepreneurIds?: string[];
  /** Entrepreneurs hidden from this tool even when global or programme visibility would grant access. */
  hiddenEntrepreneurIds?: string[];
  /** Backend file asset id for uploaded PDF resources. */
  pdfAssetId?: string;
  /** Display name of the uploaded template file. */
  pdfFileName?: string;
  /** Browser-renderable PDF URL for downloadable templates. */
  pdfUrl?: string;
  /** Browser-renderable URL for embedded online tools. */
  embedUrl?: string;
  /** ISO timestamp for the last admin update. */
  updatedAt?: string;
  /** Icon key used by the rendering layer. */
  iconKey: 'canvas' | 'document' | 'timer' | 'star' | 'plus' | 'calendar';
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
  accent: 'bid' | 'info' | 'success' | 'neutral';
  percent: number; // 0-100 bar width
}
