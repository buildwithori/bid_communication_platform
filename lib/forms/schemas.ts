import { z } from 'zod';

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
  country: z.enum(['Ghana', 'Nigeria', 'Kenya']),
  sector: z.string().min(1, 'Select a sector'),
  stage: z.enum(['idea', 'growth', 'scale']),
  goalType: z.enum(['fundraising', 'programme-completion', 'milestone']),
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

export const programSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  maxEntrepreneurs: z.string(),
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

export const bookingSchema = z.object({
  sessionType: z.string().min(1, 'Pick a session type'),
  recipient: z.enum(['specific', 'general']),
  trainerId: z.string().optional(),
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
});
export type FundingRoundForm = z.infer<typeof fundingRoundSchema>;

export const periodicUpdateSchema = z.object({
  period: z.string().min(1, 'Pick a period'),
  jobsWomen: z.string(),
  jobsMen: z.string(),
  fundsMobilisedUsd: z.string(),
  notes: z.string().optional(),
});
export type PeriodicUpdateForm = z.infer<typeof periodicUpdateSchema>;

export const toolRequestSchema = z.object({
  name: z.string().min(1, 'Tool name or idea is required'),
  reason: z.string().optional(),
});
export type ToolRequestForm = z.infer<typeof toolRequestSchema>;

export const newSectorSchema = z.object({
  label: z.string().min(1, 'Sector name is required'),
});
export type NewSectorForm = z.infer<typeof newSectorSchema>;

export const stageDefinitionEditSchema = z.object({
  definition: z.string().min(1, 'Definition is required'),
});
export type StageDefinitionEditForm = z.infer<typeof stageDefinitionEditSchema>;

export const stageDefinitionSchema = z.object({
  idea: z.string().min(1, 'Definition is required'),
  growth: z.string().min(1, 'Definition is required'),
  scale: z.string().min(1, 'Definition is required'),
});
export type StageDefinitionForm = z.infer<typeof stageDefinitionSchema>;

export const businessProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  sector: z.string().min(1, 'Select a sector'),
  stage: z.enum(['idea', 'growth', 'scale']),
  representative: z.string().min(1, 'Representative name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
});
export type BusinessProfileForm = z.infer<typeof businessProfileSchema>;

export const programmeGoalSchema = z.object({
  goalType: z.enum(['fundraising', 'programme-completion', 'milestone']),
  targetAmountUsd: z.string().optional(),
  description: z.string().optional(),
});
export type ProgrammeGoalForm = z.infer<typeof programmeGoalSchema>;

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

export const contentItemSchema = z.object({
  title: z.string().min(1, 'Content title is required'),
  type: z.enum(['video', 'pdf', 'tool']),
});
export type ContentItemForm = z.infer<typeof contentItemSchema>;

export const requiredDeliverableSchema = z.object({
  name: z.string().min(1, 'Deliverable name is required'),
  due: z.string().min(1, 'Due rule is required'),
  requiredFor: z.string().min(1, 'Audience is required'),
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
