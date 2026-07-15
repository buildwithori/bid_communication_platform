# Audit Lifecycle

BID Hub audits meaningful business actions through workflow and lifecycle helpers. A raw database update is not enough context to explain whether a programme was published, a session was accepted, or access was revoked.

## Feature usage

Use `AuditService.capture` around a business mutation:

```ts
return this.audit.capture(
  {
    action: "settings.sector.updated",
    entityType: "sector",
    entityId: (sector) => sector.id,
    summary: (sector) => `Sector ${sector.name} updated`,
    payload: safeBusinessMetadata,
  },
  (tx) =>
    tx.sector.update({
      where: { id },
      data,
    }),
);
```

`capture` owns the interactive transaction. The business mutation and outbox insert either commit together or roll back together. Request context supplies:

- actor user ID
- request ID
- correlation ID
- IP address
- user agent

Feature services must not create or update `audit_logs` directly. Multi-step workflows should place all related business writes inside the mutation callback and return the primary auditable entity.

## Processing and immutability

`AuditWorkerService` polls pending and failed outbox events without overlapping its own runs. It:

- claims events transactionally
- retries failed events up to ten attempts
- creates one log per unique outbox event
- marks processed events complete
- leaves terminal failures visible in the outbox

The `audit_logs` table rejects updates and deletes at the PostgreSQL layer.

## Sensitive data

Payload redaction is centralized and recursive. Passwords, tokens, secrets, cookies, authorization values, signed URLs, signatures, and private keys are replaced before the outbox write.

Payloads should still be intentionally small. Never include raw files, email bodies, OAuth credentials, session cookies, or complete request bodies when a few business fields explain the event.

## Prisma safety nets

A Prisma extension or repository hook may eventually capture generic before/after diffs for selected sensitive models, but it is not the main audit mechanism:

- raw hooks cannot infer business intent
- an after-query hook cannot guarantee an atomic outbox insert
- generic events can duplicate named lifecycle events

Any safety net must be selected-model only, redact values, preserve transaction atomicity, and suppress itself when a named lifecycle event covers the same mutation.
