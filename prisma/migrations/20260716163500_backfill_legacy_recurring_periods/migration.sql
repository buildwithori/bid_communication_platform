-- Recurring instances created before explicit period tracking retain their
-- original due date. Since their calendar anchor is not recoverable, treat that
-- due date as the legacy period boundary and derive one cadence window backward.
WITH legacy_occurrences AS (
    SELECT
        instance."id",
        instance."rule_id",
        instance."entrepreneur_user_id",
        instance."programme_id",
        CASE rule."recurring_cadence"
            WHEN 'monthly'::"DeliverableRecurringCadence"
                THEN instance."due_date" - INTERVAL '1 month' + INTERVAL '1 millisecond'
            WHEN 'quarterly'::"DeliverableRecurringCadence"
                THEN instance."due_date" - INTERVAL '3 months' + INTERVAL '1 millisecond'
            ELSE instance."due_date" - INTERVAL '6 months' + INTERVAL '1 millisecond'
        END AS period_start
    FROM "deliverable_instances" AS instance
    INNER JOIN "programme_deliverable_rules" AS rule
        ON rule."id" = instance."rule_id"
    WHERE rule."due_type" = 'recurring'::"DeliverableDueType"
        AND rule."recurring_cadence" IS NOT NULL
        AND instance."period_start" IS NULL
)
DELETE FROM "deliverable_instances" AS generated
USING legacy_occurrences AS legacy
WHERE generated."id" <> legacy."id"
    AND generated."rule_id" = legacy."rule_id"
    AND generated."entrepreneur_user_id" = legacy."entrepreneur_user_id"
    AND generated."programme_id" = legacy."programme_id"
    AND generated."period_start" = legacy."period_start"
    AND NOT EXISTS (
        SELECT 1
        FROM "deliverable_submissions" AS submission
        WHERE submission."instance_id" = generated."id"
    );

UPDATE "deliverable_instances" AS instance
SET
    "period_end" = instance."due_date",
    "period_start" = CASE rule."recurring_cadence"
        WHEN 'monthly'::"DeliverableRecurringCadence"
            THEN instance."due_date" - INTERVAL '1 month' + INTERVAL '1 millisecond'
        WHEN 'quarterly'::"DeliverableRecurringCadence"
            THEN instance."due_date" - INTERVAL '3 months' + INTERVAL '1 millisecond'
        ELSE instance."due_date" - INTERVAL '6 months' + INTERVAL '1 millisecond'
    END,
    "updated_at" = CURRENT_TIMESTAMP
FROM "programme_deliverable_rules" AS rule
WHERE rule."id" = instance."rule_id"
    AND rule."due_type" = 'recurring'::"DeliverableDueType"
    AND rule."recurring_cadence" IS NOT NULL
    AND instance."period_start" IS NULL;
