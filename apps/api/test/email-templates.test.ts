import assert from "node:assert/strict";
import test from "node:test";
import { render } from "@react-email/render";
import { NotificationType, UserRole } from "@prisma/client";
import { VerificationEmail } from "../src/auth/emails/verification-email";
import { AdminWelcomeEmail } from "../src/admins/emails/admin-welcome-email";
import { DeliverableNotificationEmail } from "../src/deliverables/emails/deliverable-notification-email";
import { EntrepreneurWelcomeEmail } from "../src/entrepreneurs/emails/entrepreneur-welcome-email";
import { SessionNotificationEmail } from "../src/sessions/emails/session-notification-email";
import { TrainerWelcomeEmail } from "../src/trainers/emails/trainer-welcome-email";

const logoUrl = "https://hub.example.test/bid-logo.png";
const actionUrl = "https://hub.example.test/entrepreneur/schedule?sessionId=1";

test("transactional email renders branded action and safety context", async () => {
  const html = await render(
    VerificationEmail({ name: "Amara", url: actionUrl, logoUrl }),
  );

  assert.match(html, /BID Hub/);
  assert.match(html, /Verify email/);
  assert.match(html, /24 hours/);
  assert.match(html, /842751/i);
  assert.match(html, /hub\.example\.test/);
});

test("declined session email gives the entrepreneur context and a next step", async () => {
  const html = await render(
    SessionNotificationEmail({
      recipientName: "Amara Mensah",
      recipientRole: UserRole.entrepreneur,
      type: NotificationType.session_declined,
      title: "Session request declined: Investor preparation",
      body: "Kofi declined your request for 24 Jul 2026 at 10:00 (Africa/Kigali). Reason: The trainer is unavailable.",
      actionUrl,
      logoUrl,
    }),
  );

  assert.match(html, /The trainer is unavailable/);
  assert.match(html, /Review declined request/);
  assert.match(html, /request another suitable time/);
});

test("deliverable review email gives a reviewer a clear action", async () => {
  const html = await render(
    DeliverableNotificationEmail({
      recipientName: "BID Reviewer",
      recipientRole: UserRole.trainer,
      type: NotificationType.deliverable_review,
      title: "Deliverable ready for review: Financial model",
      body: "Akwaaba Foods submitted Financial model for Growth Programme. File: model.xlsx.",
      actionUrl: "https://hub.example.test/trainer/deliverable-reviews",
      logoUrl,
    }),
  );

  assert.match(html, /Akwaaba Foods/);
  assert.match(html, /Review submission/);
  assert.match(html, /record a clear decision/);
});

test("welcome emails give each role its own workspace guidance", async () => {
  const adminHtml = await render(
    AdminWelcomeEmail({
      name: "Amina",
      dashboardUrl: "https://hub.example.test/admin/dashboard",
      logoUrl,
    }),
  );
  const trainerHtml = await render(
    TrainerWelcomeEmail({
      name: "Kofi",
      dashboardUrl: "https://hub.example.test/trainer/dashboard",
      logoUrl,
    }),
  );
  const entrepreneurHtml = await render(
    EntrepreneurWelcomeEmail({
      name: "Amara",
      dashboardUrl: "https://hub.example.test/entrepreneur/dashboard",
      logoUrl,
    }),
  );

  assert.match(adminHtml, /Admin workspace/);
  assert.match(adminHtml, /manage programmes/);
  assert.match(trainerHtml, /Trainer workspace/);
  assert.match(trainerHtml, /connect your calendar/);
  assert.match(entrepreneurHtml, /Entrepreneur workspace/);
  assert.match(entrepreneurHtml, /current learning/);
});
