import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";
import { ToolRequestsService } from "../src/tools/tool-requests.service";

function dateInTimezone(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

test("tool requests reject needed-by dates up to and including today", async () => {
  const service = new ToolRequestsService(
    {} as never,
    {} as never,
    {} as never,
  );
  const today = dateInTimezone(new Date(), "Africa/Kigali");
  const yesterdayDate = new Date(`${today}T00:00:00.000Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const user = {
    id: "entrepreneur-1",
    role: UserRole.entrepreneur,
    timezone: "Africa/Kigali",
  };

  for (const neededBy of [yesterday, today]) {
    await assert.rejects(
      service.createRequest(user as never, {
        title: "Cash flow tool",
        businessNeed: "We need a clearer cash flow forecast.",
        toolAreaId: "finance",
        neededBy,
      }),
      /Needed-by date must be after today/,
    );
  }
});
