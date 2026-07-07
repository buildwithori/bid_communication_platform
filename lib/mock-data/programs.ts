import type { Program, Module, ContentItem } from '@/types';

/**
 * Seed programmes, their modules, and the content items attached to
 * each module. A content item can be reused across modules (mirroring
 * the "reuse" idea in the mockups), and modules can be reused across
 * programmes — the `reuseCount` field drives the "used in 2 programmes"
 * tag.
 */

export const programs: Program[] = [
  {
    id: 'p-accelerator-c6',
    name: 'BID Accelerator – Cohort 6',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'active',
    maxEntrepreneurs: 20,
    description:
      'Core accelerator curriculum covering foundations, business model, fundraising and operations.',
    accent: 'bid',
    entrepreneursCount: 18,
    leftEntrepreneursCount: 2,
    moduleIds: ['m-intro', 'm-bmc', 'm-pitch', 'm-finmodel', 'm-legal'],
    progress: 61,
  },
  {
    id: 'p-readiness-fintech',
    name: 'Investment Readiness for Fintech',
    startDate: '2025-03-01',
    endDate: '2025-09-30',
    status: 'active',
    maxEntrepreneurs: 15,
    description:
      'Specialised track on investor relations, due diligence prep and term sheets.',
    accent: 'info',
    entrepreneursCount: 9,
    leftEntrepreneursCount: 1,
    moduleIds: ['m-pitch', 'm-finmodel', 'm-ddprep'],
    progress: 20,
  },
  {
    id: 'p-wee',
    name: 'Women Economic Empowerment Programme',
    startDate: '2025-02-01',
    endDate: '2025-11-30',
    status: 'active',
    maxEntrepreneurs: 25,
    description:
      'Programme supporting women-led ventures with tailored training and mentoring.',
    accent: 'success',
    entrepreneursCount: 20,
    leftEntrepreneursCount: 4,
    moduleIds: ['m-intro'],
    progress: 12,
  },
];

export const modules: Module[] = [
  {
    id: 'm-intro',
    order: 1,
    title: 'Introduction to Entrepreneurship in Africa',
    description: 'Foundational orientation to the African startup landscape.',
    contentItemIds: ['c-intro-vid', 'c-intro-pdf'],
    reuseCount: 2,
  },
  {
    id: 'm-bmc',
    order: 2,
    title: 'Business Model Canvas Deep Dive',
    description: 'Map and iterate on every block of the BMC.',
    contentItemIds: ['c-bmc-why', 'c-bmc-sheet', 'c-bmc-valueprop', 'c-bmc-tool'],
    reuseCount: 2,
  },
  {
    id: 'm-pitch',
    order: 3,
    title: 'Investor Pitch Fundamentals',
    description: 'Structure, deliver and defend your investor pitch.',
    contentItemIds: ['c-pitch-structure', 'c-pitch-qa', 'c-pitch-checklist'],
    reuseCount: 2,
  },
  {
    id: 'm-finmodel',
    order: 4,
    title: 'Financial Modelling for Early-Stage Startups',
    description: 'Build a 3-year operating model.',
    contentItemIds: ['c-finmodel-basics'],
  },
  {
    id: 'm-legal',
    order: 5,
    title: 'Legal Structures for Startups',
    description: 'Choose the right entity and equity structure.',
    contentItemIds: [],
  },
  {
    id: 'm-ddprep',
    order: 1,
    title: 'Due Diligence Preparation',
    description: 'Get your data room and disclosures ready for investors.',
    contentItemIds: [],
  },
];

export const contentItems: ContentItem[] = [
  {
    id: 'c-intro-vid',
    title: 'Welcome & overview',
    chapter: 'Chapter 1',
    type: 'video',
    durationLabel: '18 min',
    moduleId: 'm-intro',
    progress: 'completed',
  },
  {
    id: 'c-intro-pdf',
    title: 'Reading list',
    chapter: 'Chapter 1',
    type: 'pdf',
    durationLabel: 'Downloadable',
    moduleId: 'm-intro',
    progress: 'completed',
  },
  {
    id: 'c-bmc-why',
    title: 'Why the canvas matters',
    chapter: 'Chapter 1',
    type: 'video',
    durationLabel: '9 min',
    moduleId: 'm-bmc',
    progress: 'completed',
  },
  {
    id: 'c-bmc-sheet',
    title: 'BMC worksheet',
    chapter: 'Chapter 1',
    type: 'pdf',
    durationLabel: 'Downloadable',
    moduleId: 'm-bmc',
    progress: 'completed',
  },
  {
    id: 'c-bmc-valueprop',
    title: 'Mapping your value proposition',
    chapter: 'Chapter 2',
    type: 'video',
    durationLabel: '15 min',
    moduleId: 'm-bmc',
    progress: 'in-progress',
  },
  {
    id: 'c-bmc-tool',
    title: 'Interactive BMC builder',
    chapter: 'Chapter 2',
    type: 'tool',
    durationLabel: 'Embedded tool',
    moduleId: 'm-bmc',
    progress: 'not-started',
  },
  {
    id: 'c-pitch-structure',
    title: 'Pitch structure',
    chapter: 'Chapter 1',
    type: 'video',
    durationLabel: '16 min',
    moduleId: 'm-pitch',
    progress: 'completed',
  },
  {
    id: 'c-pitch-qa',
    title: 'Handling investor Q&A',
    chapter: 'Chapter 1',
    type: 'video',
    durationLabel: '12 min',
    moduleId: 'm-pitch',
    progress: 'completed',
  },
  {
    id: 'c-pitch-checklist',
    title: 'Pitch checklist',
    chapter: 'Chapter 1',
    type: 'pdf',
    durationLabel: 'Downloadable',
    moduleId: 'm-pitch',
    progress: 'completed',
  },
  {
    id: 'c-finmodel-basics',
    title: 'Financial modelling basics',
    chapter: 'Chapter 1',
    type: 'video',
    durationLabel: '22 min',
    moduleId: 'm-finmodel',
    progress: 'not-started',
  },
];

export const programById = (id?: string) =>
  id ? programs.find((p) => p.id === id) : undefined;

export const moduleById = (id?: string) =>
  id ? modules.find((m) => m.id === id) : undefined;

export const contentItemById = (id: string) =>
  contentItems.find((c) => c.id === id);

export const modulesForProgram = (programId: string) => {
  const program = programById(programId);
  if (!program) return [];
  return modules
    .filter((m) => program.moduleIds.includes(m.id))
    .sort((a, b) => a.order - b.order);
};

export const contentForModule = (moduleId: string) =>
  contentItems.filter((c) => c.moduleId === moduleId);
