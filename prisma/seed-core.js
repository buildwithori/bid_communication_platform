const companySettings = {
  singletonKey: "default",
  periodicUpdateOverdueAfterDays: 30,
  moduleCompletionDeliverableDueDays: 7,
  defaultCurrency: "USD",
  defaultTimezone: "Africa/Kigali",
  defaultSessionProvider: "google_meet",
  inAppNotificationsEnabledByDefault: true,
  emailNotificationsEnabledByDefault: true,
  reminderNotificationsEnabledByDefault: true,
  weeklyDigestEnabledByDefault: false,
};

const sectors = [
  ["Fintech", "fintech"],
  ["Agritech", "agritech"],
  ["Healthtech", "healthtech"],
  ["Edtech", "edtech"],
  ["Logistics", "logistics"],
  ["Construction", "construction"],
  ["Renewable Energy", "renewable-energy"],
];

const stages = [
  [
    "Idea",
    "idea",
    "Early concept stage, pre-revenue, validating problem and solution fit.",
  ],
  [
    "Growth",
    "growth",
    "Business has validated revenue and is actively scaling operations.",
  ],
  [
    "Scale",
    "scale",
    "Established business expanding into new markets, products, or team size.",
  ],
];

const goalTypes = [
  [
    "Fundraising target",
    "fundraising-target",
    "Capital raise target tracked against linked fundraising rounds.",
    true,
  ],
  [
    "Programme completion",
    "programme-completion",
    "Completion target for an assigned programme.",
    false,
  ],
  [
    "Milestone",
    "milestone",
    "Programme-specific business milestone tracked by BID and the entrepreneur.",
    false,
  ],
];

const toolAreas = [
  ["Fundraising", "fundraising"],
  ["Finance", "finance"],
  ["Operations", "operations"],
  ["Pitching", "pitching"],
  ["Legal", "legal"],
  ["Market research", "market-research"],
];

async function seedCore(client, { updateExisting = true } = {}) {
  const update = (value) => (updateExisting ? value : {});

  await client.companySettings.upsert({
    where: { singletonKey: companySettings.singletonKey },
    update: update(companySettings),
    create: companySettings,
  });

  for (const [name, key] of sectors) {
    const value = { name, active: true };
    await client.sector.upsert({
      where: { key },
      update: update(value),
      create: { key, ...value },
    });
  }

  for (const [name, key, definition] of stages) {
    const value = { name, definition, active: true };
    await client.businessStage.upsert({
      where: { key },
      update: update(value),
      create: { key, ...value },
    });
  }

  for (const [name, key, description, requiresTargetAmount] of goalTypes) {
    const value = { name, description, requiresTargetAmount, active: true };
    await client.programmeGoalType.upsert({
      where: { key },
      update: update(value),
      create: { key, ...value },
    });
  }

  for (const [name, key] of toolAreas) {
    const value = { name, active: true };
    await client.toolArea.upsert({
      where: { key },
      update: update(value),
      create: { key, ...value },
    });
  }
}

module.exports = { sectors, seedCore };
