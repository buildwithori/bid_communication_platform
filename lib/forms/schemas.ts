import { z } from 'zod';
import { countries } from '@/lib/mock-data/definitions';

/**
 * Form validation schemas. Each one mirrors a form in the mockups and
 * is consumed by the corresponding modal via react-hook-form's
 * zodResolver.
 *
 * Numeric inputs are kept as strings in the schema (so react-hook-form's
 * `defaultValues` and `register` type-check cleanly) and parsed to
 * numbers at the handler boundary.
 */

export const entrepreneurSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  representative: z.string().min(1, 'Representative name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  country: z.enum(countries),
  sector: z.string().min(1, 'Select a sector'),
  stage: z.string().min(1, 'Select a stage'),
  goalType: z.string().min(1, 'Select a goal type'),
  goalAmountUsd: z.string().optional(),
  programmeId: z.string().optional(), // 'none' string means unassigned
  trainerId: z.string().optional(),
});
export type EntrepreneurForm = z.infer<typeof entrepreneurSchema>;

export const trainerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(['Mentor', 'Trainer', 'Guest Expert', 'Investment Analyst']),
  accessLevel: z.enum(['full', 'guest']),
  accessExpiresOn: z.string().optional(),
  specialisms: z.string().optional(), // comma-separated in the form
  maxEntrepreneurs: z.string().optional(),
});
export type TrainerForm = z.infer<typeof trainerSchema>;

export const adminInviteSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  note: z.string().optional(),
});
export type AdminInviteForm = z.infer<typeof adminInviteSchema>;

export const programSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  accessType: z.enum(['assigned', 'free']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  maxEntrepreneurs: z.string(),
  publishState: z.enum(['draft', 'published']),
  description: z.string().optional(),
});
export type ProgramForm = z.infer<typeof programSchema>;

export const moduleSchema = z.object({
  title: z.string().min(1, 'Module title is required'),
  description: z.string().optional(),
});
export type ModuleForm = z.infer<typeof moduleSchema>;

export const assignToProgramSchema = z.object({
  entrepreneurId: z.string().min(1, 'Select an entrepreneur'),
  programmeId: z.string().min(1, 'Select a programme'),
  trainerId: z.string().optional(),
  startDate: z.string().optional(),
});
export type AssignToProgramForm = z.infer<typeof assignToProgramSchema>;

export const assignTrainerSchema = z.object({
  entrepreneurId: z.string().min(1, 'Select an entrepreneur'),
  trainerId: z.string().min(1, 'Select a trainer'),
  engagementType: z.enum(['Full mentorship', 'Guest session only', 'Workshop facilitator']),
});
export type AssignTrainerForm = z.infer<typeof assignTrainerSchema>;

export const messageSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  channel: z.enum(['email', 'in-app']),
  priority: z.enum(['standard', 'needs-response', 'urgent']),
  message: z.string().min(10, 'Message should be at least 10 characters'),
});
export type MessageForm = z.infer<typeof messageSchema>;

export const bookingSchema = z.object({
  sessionType: z.string().min(1, 'Pick a session type'),
  recipient: z.enum(['specific', 'general']),
  trainerId: z.string().optional(),
  topic: z.string().min(1, 'Add the session topic or goal'),
  date: z.string().min(1, 'Pick a date'),
  time: z.string().min(1, 'Pick a time'),
  notes: z.string().optional(),
});
export type BookingForm = z.infer<typeof bookingSchema>;

export const deliverableSchema = z.object({
  deliverableId: z.string().min(1, 'Select the deliverable requirement'),
  name: z.string().optional(),
  fileName: z.string().min(1, 'Add a file name for this UI flow'),
  notes: z.string().optional(),
});
export type DeliverableForm = z.infer<typeof deliverableSchema>;

export const fundingRoundSchema = z.object({
  name: z.string().min(1, 'Round name is required'),
  amountUsd: z.string().min(1, 'Amount is required'),
  date: z.string().min(1, 'Date is required'),
  source: z.string().optional(),
  programmeId: z.string().optional(),
  goalId: z.string().optional(),
});
export type FundingRoundForm = z.infer<typeof fundingRoundSchema>;

export const periodicUpdateSchema = z.object({
  programmeId: z.string().min(1, 'Choose whether this update is company-wide or programme-specific'),
  periodStart: z.string().min(1, 'Pick a start date'),
  periodEnd: z.string().min(1, 'Pick an end date'),
  jobsWomen: z.string(),
  jobsMen: z.string(),
  fundsMobilisedUsd: z.string().optional(),
  notes: z.string().optional(),
});
export type PeriodicUpdateForm = z.infer<typeof periodicUpdateSchema>;

export const toolRequestSchema = z.object({
  name: z.string().min(1, 'Tool name or idea is required'),
  category: z.string().min(1, 'Select a tool area'),
  neededBy: z.string().optional(),
  reason: z.string().optional(),
});
export type ToolRequestForm = z.infer<typeof toolRequestSchema>;

export const newSectorSchema = z.object({
  label: z.string().min(1, 'Sector name is required'),
});
export type NewSectorForm = z.infer<typeof newSectorSchema>;

export const businessStageSchema = z.object({
  label: z.string().min(1, 'Stage name is required'),
  definition: z.string().min(1, 'Definition is required'),
});
export type BusinessStageForm = z.infer<typeof businessStageSchema>;

export const stageDefinitionSchema = z.object({
  idea: z.string().min(1, 'Definition is required'),
  growth: z.string().min(1, 'Definition is required'),
  scale: z.string().min(1, 'Definition is required'),
});
export type StageDefinitionForm = z.infer<typeof stageDefinitionSchema>;

export const businessProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  sector: z.string().min(1, 'Select a sector'),
  stage: z.string().min(1, 'Select a stage'),
  country: z.enum(countries),
  representative: z.string().min(1, 'Representative name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
});
export type BusinessProfileForm = z.infer<typeof businessProfileSchema>;

export const programmeGoalSchema = z.object({
  programmeId: z.string().optional(),
  goalType: z.string().min(1, 'Select a goal type'),
  targetAmountUsd: z.string().optional(),
  description: z.string().optional(),
}).superRefine((values, ctx) => {
  if (['programme-completion', 'milestone'].includes(values.goalType) && !values.programmeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['programmeId'],
      message: 'Select a programme for this goal type',
    });
  }
});
export type ProgrammeGoalForm = z.infer<typeof programmeGoalSchema>;

export const programmeGoalTypeSchema = z.object({
  label: z.string().min(1, 'Goal type name is required'),
  description: z.string().optional(),
  requiresTargetAmount: z.boolean().optional(),
});
export type ProgrammeGoalTypeForm = z.infer<typeof programmeGoalTypeSchema>;

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  representative: z.string().min(1, 'Representative name is required'),
  email: z.string().email('Enter a valid email'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone number is required'),
});
export type SignupForm = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const contentItemSchema = z
  .object({
    title: z.string().min(1, 'Content title is required'),
    type: z.enum(['video', 'pdf', 'tool']),
    trainerId: z.string().min(1, 'Select the trainer who owns this content'),
    videoFileName: z.string().optional(),
    pdfFileName: z.string().optional(),
    fileUrl: z.string().optional(),
    toolSource: z.enum(['library', 'custom']).default('library'),
    linkedToolId: z.string().optional(),
    toolUrl: z.string().optional(),
  })
  .refine(
    (values) => values.type !== 'video' || Boolean(values.videoFileName?.trim()),
    {
      message: 'Upload or select a video file',
      path: ['videoFileName'],
    },
  )
  .refine(
    (values) => values.type !== 'pdf' || Boolean(values.pdfFileName?.trim()),
    {
      message: 'Attach a PDF learning file',
      path: ['pdfFileName'],
    },
  )
  .refine(
    (values) => values.type !== 'tool' || values.toolSource !== 'library' || Boolean(values.linkedToolId?.trim()),
    {
      message: 'Select an entrepreneur tool',
      path: ['linkedToolId'],
    },
  )
  .refine(
    (values) => values.type !== 'tool' || values.toolSource !== 'custom' || z.string().url().safeParse(values.toolUrl).success,
    {
      message: 'Enter a valid embedded tool link',
      path: ['toolUrl'],
    },
  );
export type ContentItemForm = z.infer<typeof contentItemSchema>;

export const requiredDeliverableSchema = z
  .object({
    name: z.string().min(1, 'Deliverable name is required'),
    due: z.string().min(1, 'Due rule is required'),
    dueType: z.enum(['fixed-date', 'module-completion', 'recurring']).default('fixed-date'),
    dueDate: z.string().optional(),
    moduleRule: z.string().optional(),
    recurringCadence: z.string().optional(),
    requiredFor: z.string().min(1, 'Audience is required'),
  })
  .refine((values) => values.dueType !== 'fixed-date' || Boolean(values.dueDate?.trim()), {
    message: 'Select the due date',
    path: ['dueDate'],
  })
  .refine((values) => values.dueType !== 'module-completion' || Boolean(values.moduleRule?.trim()), {
    message: 'Select the module or milestone',
    path: ['moduleRule'],
  })
  .refine((values) => values.dueType !== 'recurring' || Boolean(values.recurringCadence?.trim()), {
    message: 'Select the recurring cadence',
    path: ['recurringCadence'],
  });
export type RequiredDeliverableForm = z.infer<typeof requiredDeliverableSchema>;

export const reuseModuleSchema = z.object({
  moduleId: z.string().min(1, 'Select a module'),
});
export type ReuseModuleForm = z.infer<typeof reuseModuleSchema>;

export const deliverableReviewSchema = z.object({
  feedback: z.string().min(1, 'Add feedback before requesting changes'),
});
export type DeliverableReviewForm = z.infer<typeof deliverableReviewSchema>;

/** Parse a string field from a form value into a number, defaulting to 0. */
export const toNumber = (v: string | number | undefined | null, fallback = 0): number => {
  if (v == null) return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
