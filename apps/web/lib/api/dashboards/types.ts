export type DashboardPoint = { date: string; progress?: number; completions?: number };

export type AdminDashboard = {
  generatedAt: string;
  currency: string;
  metrics: {
    totalEntrepreneurs: number;
    activeBusinesses: number;
    activeProgrammes: number;
    fundsMobilisedCents: number;
    averageTrainingProgress: number;
    trackedProgrammeProgress: number;
    withoutProgramme: number;
  };
  programmeHealthPreview: Array<{
    id: string;
    name: string;
    active: number;
    left: number;
    openSeats: number;
    capacity: number;
    completion: number;
    retention: number;
  }>;
  sectorBreakdown: Array<{ id: string; name: string; value: number }>;
  stageBreakdown: Array<{ id: string; name: string; value: number; percent: number }>;
  fundsTrend: Array<{ month: string; amountCents: number }>;
  topFundraisers: Array<{
    entrepreneurUserId: string;
    businessName: string;
    sectorName: string;
    amountCents: number;
  }>;
  pendingActions: {
    deliverablesAwaitingReview: number;
    selfRegisteredWithoutProgramme: number;
    toolRequestsUnderReview: number;
  };
};

export type DashboardRecentEntrepreneur = {
  entrepreneurUserId: string;
  businessName: string;
  representativeName: string;
  email: string;
  source: "self_registered" | "admin_invited";
  businessStatus: "active" | "inactive" | "archived";
  userStatus: "pending" | "active" | "inactive";
  hasProgramme: boolean;
  sector: { id: string; name: string } | null;
  stage: { id: string; name: string } | null;
  joinedAt: string;
};

export type AdminRecentEntrepreneurQuery = {
  search?: string;
  source?: DashboardRecentEntrepreneur["source"];
  status?: "active" | "without_programme";
  take?: number;
  cursor?: string;
};

export type DashboardRecentEntrepreneurPage = {
  items: DashboardRecentEntrepreneur[];
  nextCursor: string | null;
  totalItems: number;
};

export type TrainerDashboard = {
  generatedAt: string;
  trainer: { name: string };
  metrics: {
    learnersReached: number;
    learnersNeedingAttention: number;
    upcomingSessions: number;
    pendingReviews: number;
    changesRequested: number;
    contentRating: number;
    ratingCount: number;
    ownedContent: number;
  };
  programmeProgressPreview: Array<{
    id: string;
    name: string;
    learners: number;
    averageProgress: number;
  }>;
  progressBands: Array<{ name: string; value: number }>;
  contentImpactTrend: Array<{ date: string; completions: number }>;
  reviewWorkload: Array<{
    status: "pending" | "changes_requested" | "approved" | "overdue";
    value: number;
  }>;
  upcomingSessions: Array<{
    id: string;
    type: "mentor_checkin" | "office_hours" | "investor_prep";
    topic: string;
    status: "requested" | "confirmed";
    startsAt: string;
    endsAt: string;
    timezone: string;
    entrepreneurName: string;
  }>;
};

export type EntrepreneurDashboard = {
  generatedAt: string;
  entrepreneur: { businessName: string };
  metrics: {
    trainingProgress: number;
    trackedProgrammes: number;
    completedContent: number;
    totalContent: number;
    deliverablesCompleted: number;
    deliverablesTotal: number;
    deliverablesPending: number;
  };
  progressTrend: Array<{ date: string; progress: number }>;
  activity: Array<{
    id: string;
    title: string;
    body: string;
    severity: "info" | "success" | "warning" | "critical";
    actionUrl: string | null;
    readAt: string | null;
    createdAt: string;
  }>;
  upcomingSessions: Array<{
    id: string;
    type: "mentor_checkin" | "office_hours" | "investor_prep";
    topic: string;
    status: "requested" | "confirmed";
    startsAt: string;
    endsAt: string;
    timezone: string;
  }>;
  activeDeliverables: Array<{
    id: string;
    name: string;
    programmeName: string;
    dueDate: string;
    status: "not_submitted" | "submitted" | "changes_required" | "overdue";
  }>;
};
