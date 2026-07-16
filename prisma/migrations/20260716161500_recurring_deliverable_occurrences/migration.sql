ALTER TABLE "deliverable_instances"
ADD COLUMN "period_start" TIMESTAMP(3),
ADD COLUMN "period_end" TIMESTAMP(3);

DROP INDEX "deliverable_instances_rule_id_entrepreneur_user_id_programme_id_key";

CREATE INDEX "deliverable_instances_rule_id_entrepreneur_user_id_programme_id_idx"
ON "deliverable_instances"("rule_id", "entrepreneur_user_id", "programme_id");

CREATE INDEX "deliverable_instances_period_start_period_end_idx"
ON "deliverable_instances"("period_start", "period_end");

CREATE UNIQUE INDEX "deliverable_instances_one_time_occurrence_key"
ON "deliverable_instances"("rule_id", "entrepreneur_user_id", "programme_id")
WHERE "period_start" IS NULL;

CREATE UNIQUE INDEX "deliverable_instances_recurring_occurrence_key"
ON "deliverable_instances"("rule_id", "entrepreneur_user_id", "programme_id", "period_start")
WHERE "period_start" IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_recurring_deliverable_instances(
    entrepreneur_filter TEXT DEFAULT NULL,
    reference_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    WITH recurring_eligibility AS (
        SELECT
            rule."id" AS rule_id,
            rule."programme_id",
            rule."recurring_cadence",
            entrepreneur."id" AS entrepreneur_user_id,
            GREATEST(
                programme."start_date",
                CASE
                    WHEN programme."access_type" = 'free'::"ProgrammeAccessType"
                        THEN entrepreneur."created_at"
                    ELSE access_grant."granted_at"
                END
            ) AS eligible_at,
            programme."end_date" AS programme_end
        FROM "programme_deliverable_rules" AS rule
        INNER JOIN "programmes" AS programme
            ON programme."id" = rule."programme_id"
        INNER JOIN "users" AS entrepreneur
            ON entrepreneur."role" = 'entrepreneur'::"UserRole"
            AND (entrepreneur_filter IS NULL OR entrepreneur."id" = entrepreneur_filter)
        LEFT JOIN LATERAL (
            SELECT access."granted_at"
            FROM "programme_access_grants" AS access
            WHERE access."programme_id" = rule."programme_id"
                AND access."entrepreneur_user_id" = entrepreneur."id"
                AND access."revoked_at" IS NULL
            LIMIT 1
        ) AS access_grant ON true
        WHERE rule."active" = true
            AND rule."due_type" = 'recurring'::"DeliverableDueType"
            AND rule."recurring_cadence" IS NOT NULL
            AND (
                programme."access_type" = 'free'::"ProgrammeAccessType"
                OR access_grant."granted_at" IS NOT NULL
            )
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
    ), bounded_eligibility AS (
        SELECT *
        FROM recurring_eligibility
        WHERE eligible_at <= LEAST(reference_at, programme_end)
    ), occurrences AS (
        SELECT
            eligibility.*,
            period."period_start",
            LEAST(
                CASE eligibility."recurring_cadence"
                    WHEN 'monthly'::"DeliverableRecurringCadence"
                        THEN period."period_start" + INTERVAL '1 month' - INTERVAL '1 millisecond'
                    WHEN 'quarterly'::"DeliverableRecurringCadence"
                        THEN period."period_start" + INTERVAL '3 months' - INTERVAL '1 millisecond'
                    ELSE period."period_start" + INTERVAL '6 months' - INTERVAL '1 millisecond'
                END,
                eligibility."programme_end"
            ) AS period_end
        FROM bounded_eligibility AS eligibility
        CROSS JOIN LATERAL generate_series(
            CASE eligibility."recurring_cadence"
                WHEN 'monthly'::"DeliverableRecurringCadence"
                    THEN date_trunc('month', eligibility."eligible_at")
                WHEN 'quarterly'::"DeliverableRecurringCadence"
                    THEN date_trunc('quarter', eligibility."eligible_at")
                ELSE date_trunc('year', eligibility."eligible_at")
                    + CASE
                        WHEN EXTRACT(MONTH FROM eligibility."eligible_at") > 6
                            THEN INTERVAL '6 months'
                        ELSE INTERVAL '0 months'
                    END
            END,
            CASE eligibility."recurring_cadence"
                WHEN 'monthly'::"DeliverableRecurringCadence"
                    THEN date_trunc('month', LEAST(reference_at, eligibility."programme_end"))
                WHEN 'quarterly'::"DeliverableRecurringCadence"
                    THEN date_trunc('quarter', LEAST(reference_at, eligibility."programme_end"))
                ELSE date_trunc('year', LEAST(reference_at, eligibility."programme_end"))
                    + CASE
                        WHEN EXTRACT(MONTH FROM LEAST(reference_at, eligibility."programme_end")) > 6
                            THEN INTERVAL '6 months'
                        ELSE INTERVAL '0 months'
                    END
            END,
            CASE eligibility."recurring_cadence"
                WHEN 'monthly'::"DeliverableRecurringCadence" THEN INTERVAL '1 month'
                WHEN 'quarterly'::"DeliverableRecurringCadence" THEN INTERVAL '3 months'
                ELSE INTERVAL '6 months'
            END
        ) AS period("period_start")
    )
    INSERT INTO "deliverable_instances" (
        "id",
        "rule_id",
        "entrepreneur_user_id",
        "programme_id",
        "due_date",
        "period_start",
        "period_end",
        "status",
        "created_at",
        "updated_at"
    )
    SELECT
        'dli_' || md5(
            occurrence."rule_id"
            || ':' || occurrence."entrepreneur_user_id"
            || ':' || occurrence."period_start"::TEXT
        ),
        occurrence."rule_id",
        occurrence."entrepreneur_user_id",
        occurrence."programme_id",
        occurrence."period_end",
        occurrence."period_start",
        occurrence."period_end",
        CASE
            WHEN occurrence."period_end" < reference_at
                THEN 'overdue'::"DeliverableInstanceStatus"
            ELSE 'not_submitted'::"DeliverableInstanceStatus"
        END,
        reference_at,
        reference_at
    FROM occurrences AS occurrence
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;

SELECT sync_recurring_deliverable_instances(NULL::TEXT, CURRENT_TIMESTAMP::timestamp(3));
