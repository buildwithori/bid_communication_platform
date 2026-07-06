export const routes = {
  home: '/',
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
  },
  entrepreneur: {
    dashboard: '/entrepreneur/dashboard',
    training: '/entrepreneur/training',
    trainingProgram: (programmeId: string) => `/entrepreneur/training/${programmeId}`,
    trainingModule: (programmeId: string, moduleId: string) =>
      `/entrepreneur/training/${programmeId}/${moduleId}`,
    profile: '/entrepreneur/profile',
    deliverables: '/entrepreneur/deliverables',
    deliverableGroup: (groupId: string) => `/entrepreneur/deliverables/${groupId}`,
    schedule: '/entrepreneur/schedule',
    tools: '/entrepreneur/tools',
  },
  admin: {
    dashboard: '/admin/dashboard',
    entrepreneurs: '/admin/entrepreneurs',
    trainers: '/admin/trainers',
    programs: '/admin/programs',
    content: '/admin/content',
    deliverableReviews: '/admin/deliverable-reviews',
    sessions: '/admin/sessions',
    toolRequests: '/admin/tool-requests',
    stagesSectors: '/admin/stages-sectors',
    settingsStages: '/admin/settings/stages',
    settingsSectors: '/admin/settings/sectors',
    reporting: '/admin/reporting',
  },
} as const;

export type AppRoute = typeof routes;
