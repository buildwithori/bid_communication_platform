-- Fixed-date deliverable rules create instances when the rule is saved. Backfill
-- entrepreneurs who became eligible after that point, before lifecycle syncing was
-- added to signup, onboarding, invitations, and programme grants.
INSERT INTO "deliverable_instances" (
    "id",
    "rule_id",
    "entrepreneur_user_id",
    "programme_id",
    "due_date",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    'dli_' || md5(rule."id" || ':' || entrepreneur."id"),
    rule."id",
    entrepreneur."id",
    rule."programme_id",
    rule."due_date",
    CASE
        WHEN rule."due_date" < CURRENT_TIMESTAMP THEN 'overdue'::"DeliverableInstanceStatus"
        ELSE 'not_submitted'::"DeliverableInstanceStatus"
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "programme_deliverable_rules" AS rule
INNER JOIN "programmes" AS programme
    ON programme."id" = rule."programme_id"
INNER JOIN "users" AS entrepreneur
    ON entrepreneur."role" = 'entrepreneur'::"UserRole"
WHERE rule."active" = true
    AND rule."due_type" = 'fixed_date'::"DeliverableDueType"
    AND rule."due_date" IS NOT NULL
    AND (
        rule."required_for_scope" = 'all'::"DeliverableRequiredScope"
        OR (
            rule."required_for_scope" = 'stage'::"DeliverableRequiredScope"
            AND EXISTS (
                SELECT 1
                FROM "business_memberships" AS membership
                INNER JOIN "businesses" AS business
                    ON business."id" = membership."business_id"
                WHERE membership."user_id" = entrepreneur."id"
                    AND membership."is_primary" = true
                    AND business."stage_id" = rule."required_stage_id"
            )
        )
    )
    AND (
        programme."access_type" = 'free'::"ProgrammeAccessType"
        OR EXISTS (
            SELECT 1
            FROM "programme_access_grants" AS access_grant
            WHERE access_grant."programme_id" = rule."programme_id"
                AND access_grant."entrepreneur_user_id" = entrepreneur."id"
                AND access_grant."revoked_at" IS NULL
        )
    )
ON CONFLICT ("rule_id", "entrepreneur_user_id", "programme_id") DO NOTHING;
