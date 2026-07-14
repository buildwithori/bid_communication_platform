const { PrismaClient } = require('@prisma/client');
const { randomBytes, scrypt: scryptCallback } = require('crypto');
const { promisify } = require('util');

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);
const DEV_ADMIN_EMAIL = 'admin@bid.org';
const DEV_ADMIN_PASSWORD = 'Password123!';

const sectors = [
  ['Fintech', 'fintech'],
  ['Agritech', 'agritech'],
  ['Healthtech', 'healthtech'],
  ['Edtech', 'edtech'],
  ['Logistics', 'logistics'],
  ['Construction', 'construction'],
  ['Renewable Energy', 'renewable-energy'],
];

const stages = [
  ['Idea', 'idea', 'Early concept stage, pre-revenue, validating problem and solution fit.'],
  ['Growth', 'growth', 'Business has validated revenue and is actively scaling operations.'],
  ['Scale', 'scale', 'Established business expanding into new markets, products, or team size.'],
];

const goalTypes = [
  ['Fundraising target', 'fundraising-target', 'Capital raise target tracked against linked fundraising rounds.', true],
  ['Programme completion', 'programme-completion', 'Completion target for an assigned programme.', false],
  ['Milestone', 'milestone', 'Programme-specific business milestone tracked by BID and the entrepreneur.', false],
];

const toolAreas = [
  ['Fundraising', 'fundraising'],
  ['Finance', 'finance'],
  ['Operations', 'operations'],
  ['Pitching', 'pitching'],
  ['Legal', 'legal'],
  ['Market research', 'market-research'],
];


const trainerSeeds = [
  {
    key: 'kofi',
    email: 'kofi.mensah@bid.org',
    firstName: 'Kofi',
    lastName: 'Mensah',
    roleLabel: 'mentor',
    specialisms: ['fintech', 'edtech'],
  },
  {
    key: 'esi',
    email: 'esi.adu@bid.org',
    firstName: 'Esi',
    lastName: 'Adu',
    roleLabel: 'trainer',
    specialisms: ['agritech', 'logistics'],
  },
];

const programmeSeeds = [
  {
    id: 'p-accelerator-c6',
    name: 'BID Accelerator - Cohort 6',
    accessType: 'assigned',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    publishedAt: '2025-12-15',
    maxEntrepreneurs: 20,
    description: 'Core accelerator curriculum covering foundations, business model, fundraising and operations.',
    modules: ['m-intro', 'm-bmc', 'm-pitch', 'm-finmodel', 'm-legal'],
  },
  {
    id: 'p-readiness-fintech',
    name: 'Investment Readiness for Fintech',
    accessType: 'assigned',
    startDate: '2026-03-01',
    endDate: '2026-09-30',
    publishedAt: '2026-02-10',
    maxEntrepreneurs: 15,
    description: 'Specialised track on investor relations, due diligence prep and term sheets.',
    modules: ['m-pitch', 'm-finmodel', 'm-ddprep'],
  },
  {
    id: 'p-wee',
    name: 'Women Economic Empowerment Programme',
    accessType: 'free',
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    publishedAt: '2026-08-01',
    maxEntrepreneurs: 25,
    description: 'Programme supporting women-led ventures with tailored training and mentoring.',
    modules: ['m-intro'],
  },
];

const moduleSeeds = [
  {
    id: 'm-intro',
    title: 'Introduction to Entrepreneurship in Africa',
    description: 'Foundational orientation to the African startup landscape.',
    content: ['c-intro-vid', 'c-intro-pdf'],
  },
  {
    id: 'm-bmc',
    title: 'Business Model Canvas Deep Dive',
    description: 'Map and iterate on every block of the BMC.',
    content: ['c-bmc-why', 'c-bmc-sheet', 'c-bmc-valueprop', 'c-bmc-tool'],
  },
  {
    id: 'm-pitch',
    title: 'Investor Pitch Fundamentals',
    description: 'Structure, deliver and defend your investor pitch.',
    content: ['c-pitch-structure', 'c-pitch-qa', 'c-pitch-checklist'],
  },
  {
    id: 'm-finmodel',
    title: 'Financial Modelling for Early-Stage Startups',
    description: 'Build a 3-year operating model.',
    content: ['c-finmodel-basics'],
  },
  {
    id: 'm-legal',
    title: 'Legal Structures for Startups',
    description: 'Choose the right entity and equity structure.',
    content: [],
  },
  {
    id: 'm-ddprep',
    title: 'Due Diligence Preparation',
    description: 'Get your data room and disclosures ready for investors.',
    content: [],
  },
];

const contentSeeds = [
  { id: 'c-intro-vid', title: 'Welcome & overview', type: 'video', trainer: 'kofi', durationSeconds: 1080, muxPlaybackId: 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe' },
  { id: 'c-intro-pdf', title: 'Reading list', type: 'pdf', trainer: 'kofi', filename: 'reading-list.pdf' },
  { id: 'c-bmc-why', title: 'Why the canvas matters', type: 'video', trainer: 'kofi', durationSeconds: 540, muxPlaybackId: 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe' },
  { id: 'c-bmc-sheet', title: 'BMC worksheet', type: 'pdf', trainer: 'kofi', filename: 'bmc-worksheet.pdf' },
  { id: 'c-bmc-valueprop', title: 'Mapping your value proposition', type: 'video', trainer: 'esi', durationSeconds: 900, muxPlaybackId: 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe' },
  { id: 'c-bmc-tool', title: 'Interactive BMC builder', type: 'tool', trainer: 'esi', externalUrl: 'https://example.com/bmc-builder' },
  { id: 'c-pitch-structure', title: 'Pitch structure', type: 'video', trainer: 'kofi', durationSeconds: 960, muxPlaybackId: 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe' },
  { id: 'c-pitch-qa', title: 'Handling investor Q&A', type: 'video', trainer: 'kofi', durationSeconds: 720, muxPlaybackId: 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe' },
  { id: 'c-pitch-checklist', title: 'Pitch checklist', type: 'pdf', trainer: 'kofi', filename: 'pitch-checklist.pdf' },
  { id: 'c-finmodel-basics', title: 'Financial modelling basics', type: 'video', trainer: 'esi', durationSeconds: 1320, muxPlaybackId: 'DS00Spx1CV902MCtPj5WknGlR102V5HFkDe' },
];

const entrepreneurToolSeeds = [
  {
    id: 'tool-bmc',
    name: 'Business Model Canvas',
    description: 'Build and iterate on your BMC directly in the browser.',
    type: 'embedded_tool',
    toolAreaKey: 'fundraising',
    status: 'published',
    visibility: 'all_entrepreneurs',
    embeddedUrl: 'https://example.com/bmc-builder',
    iconKey: 'canvas',
  },
  {
    id: 'tool-finmodel',
    name: 'Financial Model Template',
    description: 'Downloadable 3-year financial model resource.',
    type: 'pdf',
    toolAreaKey: 'finance',
    status: 'published',
    visibility: 'programmes',
    programmeIds: ['p-accelerator-c6', 'p-readiness-fintech'],
    pdfFileName: 'financial-model-template.pdf',
    iconKey: 'document',
  },
  {
    id: 'tool-pitch-timer',
    name: 'Pitch Timer',
    description: 'Practice your investor pitch with structured timing cues.',
    type: 'embedded_tool',
    toolAreaKey: 'pitching',
    status: 'published',
    visibility: 'all_entrepreneurs',
    embeddedUrl: 'https://example.com/pitch-timer',
    iconKey: 'timer',
  },
  {
    id: 'tool-pitch-scorer',
    name: 'Pitch Deck Scorer Checklist',
    description: "Self-assessment checklist against BID's investor-readiness criteria.",
    type: 'pdf',
    toolAreaKey: 'fundraising',
    status: 'published',
    visibility: 'programmes',
    programmeIds: ['p-readiness-fintech'],
    pdfFileName: 'pitch-deck-scorer-checklist.pdf',
    iconKey: 'star',
  },
  {
    id: 'tool-market-sizing',
    name: 'Market Sizing Calculator',
    description: 'Estimate TAM, SAM and SOM with guided inputs.',
    type: 'embedded_tool',
    toolAreaKey: 'market-research',
    status: 'draft',
    visibility: 'entrepreneurs',
    entrepreneurEmails: ['amara@paybridge.africa'],
    embeddedUrl: 'https://example.com/market-sizing',
    iconKey: 'plus',
  },
  {
    id: 'tool-quarterly',
    name: 'Quarterly Goal Tracker',
    description: 'Printable resource for setting and tracking quarterly goals.',
    type: 'pdf',
    toolAreaKey: 'operations',
    status: 'archived',
    visibility: 'all_entrepreneurs',
    pdfFileName: 'quarterly-goal-tracker.pdf',
    iconKey: 'calendar',
  },
];

const toolRequestSeeds = [
  {
    id: 'tr-cap-table',
    entrepreneurEmail: 'amara@paybridge.africa',
    title: 'Cap table modelling tool',
    toolAreaKey: 'fundraising',
    businessNeed: 'We need to model founder dilution, SAFE notes, and new investor ownership before our Series A conversations.',
    neededBy: '2026-07-18',
    status: 'in_development',
    adminDecisionNote: 'Approved for development. BID will scope this as an online tool for fundraising support, starting with cap table scenarios, SAFE notes, and investor ownership modelling.',
    decidedAt: '2026-07-06',
  },
  {
    id: 'tr-investor-outreach',
    entrepreneurEmail: 'amara@paybridge.africa',
    title: 'Investor outreach tracker',
    toolAreaKey: 'fundraising',
    businessNeed: 'We need a lightweight way to track investor conversations, next steps, warm introductions, and follow-up dates during the fundraising sprint.',
    neededBy: '2026-08-01',
    status: 'under_review',
  },
  {
    id: 'tr-runway',
    entrepreneurEmail: 'amara@paybridge.africa',
    title: 'Monthly cash runway calculator',
    toolAreaKey: 'finance',
    businessNeed: 'We want to compare monthly burn, expected revenue, and hiring plans to understand how long our current cash balance will last.',
    status: 'built',
    linkedToolId: 'tool-finmodel',
    adminDecisionNote: 'Built and added to the tools library as a finance resource. It includes burn rate, runway, hiring assumptions, and revenue sensitivity inputs.',
    decidedAt: '2026-07-03',
  },
  {
    id: 'tr-whatsapp-investor',
    entrepreneurEmail: 'amara@paybridge.africa',
    title: 'WhatsApp investor broadcast resource',
    toolAreaKey: 'marketing',
    businessNeed: 'We wanted a resource that can send investor updates over WhatsApp after monthly traction milestones.',
    status: 'declined',
    adminDecisionNote: 'Declined for now because investor update distribution should stay email-based inside BID workflows.',
    decidedAt: '2026-07-02',
  },
];


const entrepreneurSeeds = [
  {
    email: 'amara@paybridge.africa',
    firstName: 'Amara',
    lastName: 'Osei',
    phone: '+233 24 555 0172',
    businessId: 'b-paybridge',
    businessName: 'PayBridge Africa Ltd',
    country: 'Ghana',
    sectorKey: 'fintech',
    stageKey: 'growth',
    source: 'admin_invited',
    programmes: [
      { id: 'p-accelerator-c6', progress: 68, completedModules: 3, completedContent: 9 },
      { id: 'p-readiness-fintech', progress: 42, completedModules: 1, completedContent: 3 },
    ],
  },
  {
    email: 'kwame@farmlink.gh',
    firstName: 'Kwame',
    lastName: 'Mensah',
    phone: '+233 27 333 0190',
    businessId: 'b-farmlink',
    businessName: 'FarmLink GH',
    country: 'Ghana',
    sectorKey: 'agritech',
    stageKey: 'idea',
    source: 'admin_invited',
    programmes: [
      { id: 'p-accelerator-c6', progress: 28, completedModules: 1, completedContent: 2 },
    ],
  },
  {
    email: 'nadia@healthfirst.ng',
    firstName: 'Nadia',
    lastName: 'Asante',
    phone: '+234 80 555 0102',
    businessId: 'b-healthfirst',
    businessName: 'HealthFirst',
    country: 'Nigeria',
    sectorKey: 'healthtech',
    stageKey: 'scale',
    source: 'self_registered',
    programmes: [
      { id: 'p-readiness-fintech', progress: 61, completedModules: 1, completedContent: 3 },
    ],
  },
];

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('base64url')}`;
}



function programmeSeedById(programmeId) {
  return programmeSeeds.find((programme) => programme.id === programmeId);
}

function moduleSeedById(moduleId) {
  return moduleSeeds.find((moduleSeed) => moduleSeed.id === moduleId);
}

function programmeContentCount(programmeId) {
  const programme = programmeSeedById(programmeId);
  if (!programme) return 0;
  return programme.modules.reduce((sum, moduleId) => {
    const moduleSeed = moduleSeedById(moduleId);
    return sum + (moduleSeed?.content.length ?? 0);
  }, 0);
}

function contentSeedById(contentItemId) {
  return contentSeeds.find((content) => content.id === contentItemId);
}

function progressStatus(progressPercent) {
  if (progressPercent >= 100) return 'completed';
  if (progressPercent > 0) return 'in_progress';
  return 'not_started';
}

async function seedLearnerProgressDetails(entrepreneurUserId, grant) {
  const programme = programmeSeedById(grant.id);
  if (!programme) return;
  const syncedAt = new Date('2026-07-01T00:00:00.000Z');

  const moduleCount = programme.modules.length;
  const targetProgrammePoints = grant.progress * moduleCount;
  const completedModulePoints = grant.completedModules * 100;
  const partialModulePercent = Math.max(0, Math.min(99, Math.round(targetProgrammePoints - completedModulePoints)));

  for (const [moduleIndex, moduleId] of programme.modules.entries()) {
    const moduleSeed = moduleSeedById(moduleId);
    if (!moduleSeed) continue;

    const modulePercent =
      moduleIndex < grant.completedModules
        ? 100
        : moduleIndex === grant.completedModules
          ? partialModulePercent
          : 0;
    const completedContentCount = modulePercent >= 100 ? moduleSeed.content.length : 0;

    await prisma.learnerModuleProgress.upsert({
      where: {
        entrepreneurUserId_programmeId_moduleId: {
          entrepreneurUserId,
          programmeId: grant.id,
          moduleId,
        },
      },
      update: {
        status: progressStatus(modulePercent),
        progressPercent: modulePercent,
        completedContentCount,
        totalContentCount: moduleSeed.content.length,
        startedAt: modulePercent > 0 ? syncedAt : null,
        completedAt: modulePercent >= 100 ? syncedAt : null,
        lastSyncedAt: syncedAt,
      },
      create: {
        entrepreneurUserId,
        programmeId: grant.id,
        moduleId,
        status: progressStatus(modulePercent),
        progressPercent: modulePercent,
        completedContentCount,
        totalContentCount: moduleSeed.content.length,
        startedAt: modulePercent > 0 ? syncedAt : null,
        completedAt: modulePercent >= 100 ? syncedAt : null,
        lastSyncedAt: syncedAt,
      },
    });

    for (const [contentIndex, contentItemId] of moduleSeed.content.entries()) {
      const contentSeed = contentSeedById(contentItemId);
      const contentPercent = modulePercent >= 100 ? 100 : contentIndex === 0 ? modulePercent : 0;
      if (contentPercent === 0) continue;

      await prisma.learnerContentProgress.upsert({
        where: {
          entrepreneurUserId_programmeId_moduleId_contentItemId: {
            entrepreneurUserId,
            programmeId: grant.id,
            moduleId,
            contentItemId,
          },
        },
        update: {
          status: progressStatus(contentPercent),
          progressPercent: contentPercent,
          durationSeconds: contentSeed?.durationSeconds ?? null,
          startedAt: contentPercent > 0 ? syncedAt : null,
          completedAt: contentPercent >= 100 ? syncedAt : null,
          lastOpenedAt: syncedAt,
          lastSyncedAt: syncedAt,
          source: 'system',
        },
        create: {
          entrepreneurUserId,
          programmeId: grant.id,
          moduleId,
          contentItemId,
          status: progressStatus(contentPercent),
          progressPercent: contentPercent,
          durationSeconds: contentSeed?.durationSeconds ?? null,
          startedAt: contentPercent > 0 ? syncedAt : null,
          completedAt: contentPercent >= 100 ? syncedAt : null,
          lastOpenedAt: syncedAt,
          lastSyncedAt: syncedAt,
          source: 'system',
        },
      });
    }
  }
}

async function seedEntrepreneurs(adminUserId, sectorIdByKey, stageIdByKey) {
  for (const entrepreneur of entrepreneurSeeds) {
    const passwordHash = await hashPassword(DEV_ADMIN_PASSWORD);
    const user = await prisma.user.upsert({
      where: { email: entrepreneur.email },
      update: {
        firstName: entrepreneur.firstName,
        lastName: entrepreneur.lastName,
        phone: entrepreneur.phone,
        role: 'entrepreneur',
        status: 'active',
        emailVerifiedAt: new Date(),
        passwordHash,
      },
      create: {
        email: entrepreneur.email,
        passwordHash,
        firstName: entrepreneur.firstName,
        lastName: entrepreneur.lastName,
        phone: entrepreneur.phone,
        role: 'entrepreneur',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.business.upsert({
      where: { id: entrepreneur.businessId },
      update: {
        name: entrepreneur.businessName,
        country: entrepreneur.country,
        sectorId: sectorIdByKey.get(entrepreneur.sectorKey) ?? null,
        stageId: stageIdByKey.get(entrepreneur.stageKey) ?? null,
        source: entrepreneur.source,
        status: 'active',
        onboardingCompletedAt: new Date(),
      },
      create: {
        id: entrepreneur.businessId,
        name: entrepreneur.businessName,
        country: entrepreneur.country,
        sectorId: sectorIdByKey.get(entrepreneur.sectorKey) ?? null,
        stageId: stageIdByKey.get(entrepreneur.stageKey) ?? null,
        source: entrepreneur.source,
        status: 'active',
        onboardingCompletedAt: new Date(),
      },
    });

    await prisma.businessMembership.upsert({
      where: { userId_businessId: { userId: user.id, businessId: entrepreneur.businessId } },
      update: { relationship: 'representative', isPrimary: true },
      create: {
        userId: user.id,
        businessId: entrepreneur.businessId,
        relationship: 'representative',
        isPrimary: true,
      },
    });

    for (const grant of entrepreneur.programmes) {
      await prisma.programmeAccessGrant.upsert({
        where: { programmeId_entrepreneurUserId: { programmeId: grant.id, entrepreneurUserId: user.id } },
        update: { revokedAt: null, revokeReason: null, grantedById: adminUserId },
        create: { programmeId: grant.id, entrepreneurUserId: user.id, grantedById: adminUserId },
      });

      const programme = programmeSeedById(grant.id);
      const totalModules = programme?.modules.length ?? 0;
      const totalContent = programmeContentCount(grant.id);

      await prisma.learnerProgrammeProgress.upsert({
        where: { entrepreneurUserId_programmeId: { entrepreneurUserId: user.id, programmeId: grant.id } },
        update: {
          status: grant.progress >= 100 ? 'completed' : grant.progress > 0 ? 'in_progress' : 'not_started',
          progressPercent: grant.progress,
          completedModuleCount: grant.completedModules,
          totalModuleCount: totalModules,
          completedContentCount: grant.completedContent,
          totalContentCount: totalContent,
        },
        create: {
          entrepreneurUserId: user.id,
          programmeId: grant.id,
          status: grant.progress >= 100 ? 'completed' : grant.progress > 0 ? 'in_progress' : 'not_started',
          progressPercent: grant.progress,
          completedModuleCount: grant.completedModules,
          totalModuleCount: totalModules,
          completedContentCount: grant.completedContent,
          totalContentCount: totalContent,
        },
      });

      await seedLearnerProgressDetails(user.id, grant);
    }
  }
}

async function seedEntrepreneurTools(adminUserId, toolAreaIdByKey) {
  const entrepreneurByEmail = new Map(
    (await prisma.user.findMany({ where: { role: 'entrepreneur' }, select: { id: true, email: true } })).map((user) => [user.email, user.id]),
  );

  for (const toolSeed of entrepreneurToolSeeds) {
    let pdfAssetId = null;
    if (toolSeed.type === 'pdf') {
      const asset = await prisma.fileAsset.upsert({
        where: { storageKey: `seed/tools/${toolSeed.pdfFileName}` },
        update: {
          contentItemId: null,
          originalFilename: toolSeed.pdfFileName,
          mimeType: 'application/pdf',
          sizeBytes: BigInt(256000),
          status: 'ready',
        },
        create: {
          storageKey: `seed/tools/${toolSeed.pdfFileName}`,
          originalFilename: toolSeed.pdfFileName,
          mimeType: 'application/pdf',
          sizeBytes: BigInt(256000),
          status: 'ready',
        },
      });
      pdfAssetId = asset.id;
    }

    await prisma.tool.upsert({
      where: { id: toolSeed.id },
      update: {
        name: toolSeed.name,
        description: toolSeed.description,
        type: toolSeed.type,
        toolAreaId: toolAreaIdByKey.get(toolSeed.toolAreaKey),
        iconKey: toolSeed.iconKey,
        visibility: toolSeed.visibility,
        status: toolSeed.status,
        pdfAssetId,
        embeddedUrl: toolSeed.type === 'embedded_tool' ? toolSeed.embeddedUrl : null,
        updatedById: adminUserId,
        publishedAt: toolSeed.status === 'published' ? new Date('2026-07-01T00:00:00.000Z') : null,
        archivedAt: toolSeed.status === 'archived' ? new Date('2026-07-01T00:00:00.000Z') : null,
      },
      create: {
        id: toolSeed.id,
        name: toolSeed.name,
        description: toolSeed.description,
        type: toolSeed.type,
        toolAreaId: toolAreaIdByKey.get(toolSeed.toolAreaKey),
        iconKey: toolSeed.iconKey,
        visibility: toolSeed.visibility,
        status: toolSeed.status,
        pdfAssetId,
        embeddedUrl: toolSeed.type === 'embedded_tool' ? toolSeed.embeddedUrl : null,
        createdById: adminUserId,
        publishedAt: toolSeed.status === 'published' ? new Date('2026-07-01T00:00:00.000Z') : null,
        archivedAt: toolSeed.status === 'archived' ? new Date('2026-07-01T00:00:00.000Z') : null,
      },
    });

    await prisma.toolProgrammeAccess.deleteMany({ where: { toolId: toolSeed.id } });
    if (toolSeed.visibility === 'programmes') {
      await prisma.toolProgrammeAccess.createMany({
        data: (toolSeed.programmeIds ?? []).map((programmeId) => ({ toolId: toolSeed.id, programmeId })),
        skipDuplicates: true,
      });
    }

    await prisma.toolEntrepreneurAccess.deleteMany({ where: { toolId: toolSeed.id } });
    if (toolSeed.visibility === 'entrepreneurs') {
      const accessRows = (toolSeed.entrepreneurEmails ?? [])
        .map((email) => entrepreneurByEmail.get(email))
        .filter(Boolean)
        .map((entrepreneurUserId) => ({ toolId: toolSeed.id, entrepreneurUserId, grantedById: adminUserId }));
      if (accessRows.length > 0) {
        await prisma.toolEntrepreneurAccess.createMany({ data: accessRows, skipDuplicates: true });
      }
    }
  }
}

async function seedToolRequests(adminUserId, toolAreaIdByKey) {
  const entrepreneurByEmail = new Map(
    (await prisma.user.findMany({ where: { role: 'entrepreneur' }, select: { id: true, email: true } })).map((user) => [user.email, user.id]),
  );

  for (const requestSeed of toolRequestSeeds) {
    const entrepreneurUserId = entrepreneurByEmail.get(requestSeed.entrepreneurEmail);
    const toolAreaId = toolAreaIdByKey.get(requestSeed.toolAreaKey);
    if (!entrepreneurUserId || !toolAreaId) continue;

    await prisma.toolRequest.upsert({
      where: { id: requestSeed.id },
      update: {
        entrepreneurUserId,
        title: requestSeed.title,
        businessNeed: requestSeed.businessNeed,
        toolAreaId,
        neededBy: requestSeed.neededBy ? new Date(`${requestSeed.neededBy}T00:00:00.000Z`) : null,
        status: requestSeed.status,
        linkedToolId: requestSeed.linkedToolId ?? null,
        adminDecisionNote: requestSeed.adminDecisionNote ?? null,
        decidedById: requestSeed.status === 'under_review' ? null : adminUserId,
        decidedAt: requestSeed.decidedAt ? new Date(`${requestSeed.decidedAt}T00:00:00.000Z`) : null,
      },
      create: {
        id: requestSeed.id,
        entrepreneurUserId,
        title: requestSeed.title,
        businessNeed: requestSeed.businessNeed,
        toolAreaId,
        neededBy: requestSeed.neededBy ? new Date(`${requestSeed.neededBy}T00:00:00.000Z`) : null,
        status: requestSeed.status,
        linkedToolId: requestSeed.linkedToolId ?? null,
        adminDecisionNote: requestSeed.adminDecisionNote ?? null,
        decidedById: requestSeed.status === 'under_review' ? null : adminUserId,
        decidedAt: requestSeed.decidedAt ? new Date(`${requestSeed.decidedAt}T00:00:00.000Z`) : null,
      },
    });
  }
}

async function seedTrainersAndProgrammes() {
  const sectorRows = await prisma.sector.findMany();
  const stageRows = await prisma.businessStage.findMany();
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: DEV_ADMIN_EMAIL } });
  const sectorIdByKey = new Map(sectorRows.map((sector) => [sector.key, sector.id]));
  const stageIdByKey = new Map(stageRows.map((stage) => [stage.key, stage.id]));
  const toolAreaRows = await prisma.toolArea.findMany();
  const toolAreaIdByKey = new Map(toolAreaRows.map((toolArea) => [toolArea.key, toolArea.id]));
  const trainerIdByKey = new Map();

  for (const trainer of trainerSeeds) {
    const passwordHash = await hashPassword(DEV_ADMIN_PASSWORD);
    const user = await prisma.user.upsert({
      where: { email: trainer.email },
      update: {
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        role: 'trainer',
        status: 'active',
        emailVerifiedAt: new Date(),
        passwordHash,
      },
      create: {
        email: trainer.email,
        passwordHash,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        role: 'trainer',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });

    trainerIdByKey.set(trainer.key, user.id);

    await prisma.trainerCapability.upsert({
      where: { userId: user.id },
      update: { roleLabel: trainer.roleLabel, accessLevel: 'full', status: 'active' },
      create: { userId: user.id, roleLabel: trainer.roleLabel, accessLevel: 'full', status: 'active' },
    });

    for (const sectorKey of trainer.specialisms) {
      const sectorId = sectorIdByKey.get(sectorKey);
      if (!sectorId) continue;
      await prisma.trainerSpecialism.upsert({
        where: { userId_sectorId: { userId: user.id, sectorId } },
        update: {},
        create: { userId: user.id, sectorId },
      });
    }
  }

  for (const content of contentSeeds) {
    const trainerId = trainerIdByKey.get(content.trainer);
    await prisma.contentItem.upsert({
      where: { id: content.id },
      update: {
        title: content.title,
        type: content.type,
        trainerId,
        durationSeconds: content.durationSeconds ?? null,
        status: 'ready',
      },
      create: {
        id: content.id,
        title: content.title,
        type: content.type,
        trainerId,
        durationSeconds: content.durationSeconds ?? null,
        status: 'ready',
      },
    });

    if (content.type === 'video') {
      await prisma.videoAsset.upsert({
        where: { contentItemId: content.id },
        update: {
          playbackId: content.muxPlaybackId,
          duration: content.durationSeconds ?? null,
          status: 'ready',
        },
        create: {
          contentItemId: content.id,
          playbackId: content.muxPlaybackId,
          duration: content.durationSeconds ?? null,
          status: 'ready',
        },
      });
    }

    if (content.type === 'pdf') {
      await prisma.fileAsset.upsert({
        where: { storageKey: `seed/content/${content.filename}` },
        update: {
          contentItemId: content.id,
          originalFilename: content.filename,
          mimeType: 'application/pdf',
          sizeBytes: BigInt(128000),
          status: 'ready',
        },
        create: {
          contentItemId: content.id,
          storageKey: `seed/content/${content.filename}`,
          originalFilename: content.filename,
          mimeType: 'application/pdf',
          sizeBytes: BigInt(128000),
          status: 'ready',
        },
      });
    }

    if (content.type === 'tool') {
      await prisma.contentToolLink.upsert({
        where: { contentItemId: content.id },
        update: { source: 'custom', externalUrl: content.externalUrl, toolId: null },
        create: { contentItemId: content.id, source: 'custom', externalUrl: content.externalUrl, toolId: null },
      });
    }
  }

  for (const moduleSeed of moduleSeeds) {
    await prisma.learningModule.upsert({
      where: { id: moduleSeed.id },
      update: {
        title: moduleSeed.title,
        description: moduleSeed.description,
        isReusable: true,
      },
      create: {
        id: moduleSeed.id,
        title: moduleSeed.title,
        description: moduleSeed.description,
        isReusable: true,
      },
    });

    for (const [index, contentItemId] of moduleSeed.content.entries()) {
      await prisma.moduleContentItem.upsert({
        where: { moduleId_contentItemId: { moduleId: moduleSeed.id, contentItemId } },
        update: { position: index + 1 },
        create: { moduleId: moduleSeed.id, contentItemId, position: index + 1 },
      });
    }
  }

  for (const programme of programmeSeeds) {
    await prisma.programme.upsert({
      where: { id: programme.id },
      update: {
        name: programme.name,
        description: programme.description,
        accessType: programme.accessType,
        startDate: new Date(`${programme.startDate}T00:00:00.000Z`),
        endDate: new Date(`${programme.endDate}T00:00:00.000Z`),
        maxEntrepreneurs: programme.maxEntrepreneurs,
        publishedAt: programme.publishedAt ? new Date(`${programme.publishedAt}T00:00:00.000Z`) : null,
      },
      create: {
        id: programme.id,
        name: programme.name,
        description: programme.description,
        accessType: programme.accessType,
        startDate: new Date(`${programme.startDate}T00:00:00.000Z`),
        endDate: new Date(`${programme.endDate}T00:00:00.000Z`),
        maxEntrepreneurs: programme.maxEntrepreneurs,
        publishedAt: programme.publishedAt ? new Date(`${programme.publishedAt}T00:00:00.000Z`) : null,
      },
    });

    for (const [index, moduleId] of programme.modules.entries()) {
      await prisma.programmeModule.upsert({
        where: { programmeId_moduleId: { programmeId: programme.id, moduleId } },
        update: { position: index + 1 },
        create: { programmeId: programme.id, moduleId, position: index + 1 },
      });
    }
  }

  await seedEntrepreneurs(adminUser.id, sectorIdByKey, stageIdByKey);
  await seedEntrepreneurTools(adminUser.id, toolAreaIdByKey);
  await seedToolRequests(adminUser.id, toolAreaIdByKey);
}

async function main() {
  await prisma.user.upsert({
    where: { email: DEV_ADMIN_EMAIL },
    update: {
      role: 'admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
    create: {
      email: DEV_ADMIN_EMAIL,
      firstName: 'Ama',
      lastName: 'Darko',
      passwordHash: await hashPassword(DEV_ADMIN_PASSWORD),
      role: 'admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.companySettings.upsert({
    where: { singletonKey: 'default' },
    update: {},
    create: {
      singletonKey: 'default',
      periodicUpdateOverdueAfterDays: 30,
      moduleCompletionDeliverableDueDays: 7,
      defaultCurrency: 'USD',
      defaultTimezone: 'Africa/Accra',
      defaultSessionProvider: 'google_meet',
      inAppNotificationsEnabledByDefault: true,
      emailNotificationsEnabledByDefault: true,
      reminderNotificationsEnabledByDefault: true,
      weeklyDigestEnabledByDefault: false,
    },
  });

  for (const [name, key] of sectors) {
    await prisma.sector.upsert({
      where: { key },
      update: { name, active: true },
      create: { name, key, active: true },
    });
  }

  for (const [name, key, definition] of stages) {
    await prisma.businessStage.upsert({
      where: { key },
      update: { name, definition, active: true },
      create: { name, key, definition, active: true },
    });
  }

  for (const [name, key, description, requiresTargetAmount] of goalTypes) {
    await prisma.programmeGoalType.upsert({
      where: { key },
      update: { name, description, requiresTargetAmount, active: true },
      create: { name, key, description, requiresTargetAmount, active: true },
    });
  }

  for (const [name, key] of toolAreas) {
    await prisma.toolArea.upsert({
      where: { key },
      update: { name, active: true },
      create: { name, key, active: true },
    });
  }

  await seedTrainersAndProgrammes();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
