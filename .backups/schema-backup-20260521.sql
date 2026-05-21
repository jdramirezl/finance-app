


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_account_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the balance of the affected account(s)
    
    -- For INSERT/UPDATE: Update the new account
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE accounts
        SET balance = (
            SELECT COALESCE(SUM(balance), 0)
            FROM pockets
            WHERE account_id = NEW.account_id
        )
        WHERE id = NEW.account_id;
    END IF;

    -- For DELETE/UPDATE: Update the old account (if different)
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.account_id <> NEW.account_id)) THEN
        UPDATE accounts
        SET balance = (
            SELECT COALESCE(SUM(balance), 0)
            FROM pockets
            WHERE account_id = OLD.account_id
        )
        WHERE id = OLD.account_id;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."calculate_account_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_pocket_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the balance of the affected pocket(s)
    -- We need to handle both OLD and NEW for updates/deletes
    
    -- For INSERT/UPDATE: Update the new pocket
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE pockets
        SET balance = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN amount 
                    ELSE -amount 
                END
            ), 0)
            FROM movements
            WHERE pocket_id = NEW.pocket_id
              AND (is_pending IS NULL OR is_pending = FALSE)  -- EXCLUDE PENDING
        )
        WHERE id = NEW.pocket_id;
    END IF;

    -- For DELETE/UPDATE: Update the old pocket (if different)
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.pocket_id <> NEW.pocket_id)) THEN
        UPDATE pockets
        SET balance = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN amount 
                    ELSE -amount 
                END
            ), 0)
            FROM movements
            WHERE pocket_id = OLD.pocket_id
              AND (is_pending IS NULL OR is_pending = FALSE)  -- EXCLUDE PENDING
        )
        WHERE id = OLD.pocket_id;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."calculate_pocket_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_investment_api_calls"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM investment_api_calls
  WHERE call_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_investment_api_calls"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_stock_prices"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM stock_prices
  WHERE last_updated < NOW() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_stock_prices"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_fixed_expense_groups_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_fixed_expense_groups_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_investment_api_calls_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_investment_api_calls_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_stock_prices_last_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_stock_prices_last_updated"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "currency" "text" NOT NULL,
    "balance" numeric(20,6) DEFAULT 0,
    "type" "text" DEFAULT 'normal'::"text",
    "stock_symbol" "text",
    "monto_invertido" numeric(20,6),
    "shares" numeric(20,6),
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "principal" numeric(20,2) DEFAULT NULL::numeric,
    "interest_rate" numeric(5,2) DEFAULT NULL::numeric,
    "term_months" integer,
    "maturity_date" timestamp without time zone,
    "compounding_frequency" character varying(20) DEFAULT NULL::character varying,
    "early_withdrawal_penalty" numeric(5,2) DEFAULT NULL::numeric,
    "withholding_tax_rate" numeric(5,2) DEFAULT NULL::numeric,
    "cd_created_at" timestamp without time zone,
    "investment_type" character varying(20) DEFAULT NULL::character varying,
    CONSTRAINT "accounts_currency_check" CHECK (("currency" = ANY (ARRAY['USD'::"text", 'MXN'::"text", 'COP'::"text", 'EUR'::"text", 'GBP'::"text"]))),
    CONSTRAINT "accounts_type_check" CHECK (("type" = ANY (ARRAY['normal'::"text", 'investment'::"text", 'cd'::"text"])))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_entries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."budget_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_currency" "text" NOT NULL,
    "target_currency" "text" NOT NULL,
    "rate" numeric(20,10) NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fixed_expense_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#3B82F6'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0
);


ALTER TABLE "public"."fixed_expense_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."fixed_expense_groups" IS 'Groups for organizing fixed expenses with batch enable/disable';



COMMENT ON COLUMN "public"."fixed_expense_groups"."name" IS 'Group name (e.g., "Payment 1", "Utilities")';



COMMENT ON COLUMN "public"."fixed_expense_groups"."color" IS 'Hex color for visual grouping';



CREATE TABLE IF NOT EXISTS "public"."investment_api_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "api_key_hash" "text" NOT NULL,
    "call_date" "date" NOT NULL,
    "call_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."investment_api_calls" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_api_calls" IS 'Tracks Alpha Vantage API calls globally to prevent exceeding rate limits';



COMMENT ON COLUMN "public"."investment_api_calls"."api_key_hash" IS 'SHA-256 hash of the API key for identification';



COMMENT ON COLUMN "public"."investment_api_calls"."call_date" IS 'Date of API calls (YYYY-MM-DD format)';



COMMENT ON COLUMN "public"."investment_api_calls"."call_count" IS 'Number of API calls made on this date';



CREATE TABLE IF NOT EXISTS "public"."movement_templates" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "account_id" "text" NOT NULL,
    "pocket_id" "text" NOT NULL,
    "sub_pocket_id" "text",
    "default_amount" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "movement_templates_type_check" CHECK (("type" = ANY (ARRAY['IngresoNormal'::"text", 'EgresoNormal'::"text", 'IngresoFijo'::"text", 'EgresoFijo'::"text"])))
);


ALTER TABLE "public"."movement_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."movements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "account_id" "uuid",
    "pocket_id" "uuid",
    "sub_pocket_id" "uuid",
    "amount" numeric(20,6) NOT NULL,
    "notes" "text",
    "displayed_date" timestamp with time zone NOT NULL,
    "is_pending" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_orphaned" boolean DEFAULT false,
    "orphaned_account_name" "text",
    "orphaned_account_currency" "text",
    "orphaned_pocket_name" "text",
    CONSTRAINT "movements_type_check" CHECK (("type" = ANY (ARRAY['IngresoNormal'::"text", 'EgresoNormal'::"text", 'IngresoFijo'::"text", 'EgresoFijo'::"text", 'InvestmentIngreso'::"text", 'InvestmentShares'::"text"])))
);


ALTER TABLE "public"."movements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."movements"."is_orphaned" IS 'Marks movements whose account or pocket was deleted (soft delete). These movements are hidden from UI but preserved for audit trail.';



COMMENT ON COLUMN "public"."movements"."orphaned_account_name" IS 'Original account name (for matching + display)';



COMMENT ON COLUMN "public"."movements"."orphaned_account_currency" IS 'Original account currency (for matching)';



COMMENT ON COLUMN "public"."movements"."orphaned_pocket_name" IS 'Original pocket name (for matching + display)';



CREATE TABLE IF NOT EXISTS "public"."net_worth_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "total_net_worth" numeric(15,2) NOT NULL,
    "base_currency" character varying(3) NOT NULL,
    "breakdown" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."net_worth_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pockets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "balance" numeric(20,6) DEFAULT 0,
    "currency" "text" NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pockets_type_check" CHECK (("type" = ANY (ARRAY['normal'::"text", 'fixed'::"text"])))
);


ALTER TABLE "public"."pockets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminder_exceptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reminder_id" "uuid" NOT NULL,
    "original_date" "date" NOT NULL,
    "action" "text" NOT NULL,
    "new_title" "text",
    "new_amount" numeric(10,2),
    "new_date" "date",
    "is_paid" boolean,
    "linked_movement_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reminder_exceptions_action_check" CHECK (("action" = ANY (ARRAY['deleted'::"text", 'modified'::"text"])))
);


ALTER TABLE "public"."reminder_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "is_paid" boolean DEFAULT false,
    "linked_movement_id" "uuid",
    "fixed_expense_id" "uuid",
    "template_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "recurrence_type" "text" DEFAULT 'once'::"text",
    "recurrence_interval" integer DEFAULT 1,
    "recurrence_days_of_week" integer[],
    "recurrence_end_type" "text" DEFAULT 'never'::"text",
    "recurrence_end_count" integer,
    "recurrence_end_date" timestamp with time zone,
    CONSTRAINT "reminders_recurrence_end_type_check" CHECK (("recurrence_end_type" = ANY (ARRAY['never'::"text", 'after'::"text", 'on_date'::"text"]))),
    CONSTRAINT "reminders_recurrence_type_check" CHECK (("recurrence_type" = ANY (ARRAY['once'::"text", 'daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reminders"."recurrence_type" IS 'Type of recurrence: once, daily, weekly, monthly, yearly, custom';



COMMENT ON COLUMN "public"."reminders"."recurrence_interval" IS 'Interval for recurrence (e.g., every 2 weeks)';



COMMENT ON COLUMN "public"."reminders"."recurrence_days_of_week" IS 'Days of week for weekly recurrence (0=Sun, 6=Sat)';



COMMENT ON COLUMN "public"."reminders"."recurrence_end_type" IS 'How recurrence ends: never, after X times, or on a date';



COMMENT ON COLUMN "public"."reminders"."recurrence_end_count" IS 'Number of occurrences before ending (when end_type=after)';



COMMENT ON COLUMN "public"."reminders"."recurrence_end_date" IS 'Date when recurrence ends (when end_type=on_date)';



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "primary_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "alpha_vantage_api_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "snapshot_frequency" character varying(20) DEFAULT 'weekly'::character varying,
    "account_card_display" "jsonb",
    CONSTRAINT "settings_primary_currency_check" CHECK (("primary_currency" = ANY (ARRAY['USD'::"text", 'MXN'::"text", 'COP'::"text", 'EUR'::"text", 'GBP'::"text"]))),
    CONSTRAINT "settings_snapshot_frequency_check" CHECK ((("snapshot_frequency")::"text" = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying, 'manual'::character varying])::"text"[])))
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."settings"."snapshot_frequency" IS 'Frequency for automatic net worth snapshots: daily, weekly, monthly, or manual';



COMMENT ON COLUMN "public"."settings"."account_card_display" IS 'JSON object storing display mode preferences for different account types on summary page. Format: {"normal": "compact|detailed", "investment": "compact|detailed", "cd": "compact|detailed"}';



CREATE TABLE IF NOT EXISTS "public"."stock_prices" (
    "id" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "price" numeric(20,6) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "market_state" "text",
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_prices" IS 'Stores stock/index prices with timestamps for caching across devices';



COMMENT ON COLUMN "public"."stock_prices"."symbol" IS 'Stock symbol (e.g., VOO, AAPL)';



COMMENT ON COLUMN "public"."stock_prices"."price" IS 'Current price with 6 decimal precision';



COMMENT ON COLUMN "public"."stock_prices"."last_updated" IS 'When price was last fetched from API';



CREATE TABLE IF NOT EXISTS "public"."sub_pockets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pocket_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "value_total" numeric(15,2) NOT NULL,
    "periodicity_months" integer NOT NULL,
    "balance" numeric(15,2) DEFAULT 0,
    "enabled" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "group_id" "uuid"
);


ALTER TABLE "public"."sub_pockets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sub_pockets"."group_id" IS 'Reference to fixed_expense_groups, NULL = Default group';



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_name_currency_key" UNIQUE ("user_id", "name", "currency");



ALTER TABLE ONLY "public"."budget_entries"
    ADD CONSTRAINT "budget_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_base_currency_target_currency_key" UNIQUE ("base_currency", "target_currency");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fixed_expense_groups"
    ADD CONSTRAINT "fixed_expense_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_api_calls"
    ADD CONSTRAINT "investment_api_calls_api_key_hash_call_date_key" UNIQUE ("api_key_hash", "call_date");



ALTER TABLE ONLY "public"."investment_api_calls"
    ADD CONSTRAINT "investment_api_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movement_templates"
    ADD CONSTRAINT "movement_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movements"
    ADD CONSTRAINT "movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."net_worth_snapshots"
    ADD CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."net_worth_snapshots"
    ADD CONSTRAINT "net_worth_snapshots_user_id_snapshot_date_key" UNIQUE ("user_id", "snapshot_date");



ALTER TABLE ONLY "public"."pockets"
    ADD CONSTRAINT "pockets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pockets"
    ADD CONSTRAINT "pockets_user_id_account_id_name_key" UNIQUE ("user_id", "account_id", "name");



ALTER TABLE ONLY "public"."reminder_exceptions"
    ADD CONSTRAINT "reminder_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_exceptions"
    ADD CONSTRAINT "reminder_exceptions_reminder_id_original_date_key" UNIQUE ("reminder_id", "original_date");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."stock_prices"
    ADD CONSTRAINT "stock_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_prices"
    ADD CONSTRAINT "stock_prices_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."sub_pockets"
    ADD CONSTRAINT "sub_pockets_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accounts_user_id" ON "public"."accounts" USING "btree" ("user_id");



CREATE INDEX "idx_budget_entries_user_id" ON "public"."budget_entries" USING "btree" ("user_id");



CREATE INDEX "idx_exchange_rates_currencies" ON "public"."exchange_rates" USING "btree" ("base_currency", "target_currency");



CREATE INDEX "idx_exchange_rates_updated" ON "public"."exchange_rates" USING "btree" ("last_updated");



CREATE INDEX "idx_fixed_expense_groups_user_id" ON "public"."fixed_expense_groups" USING "btree" ("user_id");



CREATE INDEX "idx_investment_api_calls_date" ON "public"."investment_api_calls" USING "btree" ("api_key_hash", "call_date");



CREATE INDEX "idx_movement_templates_user" ON "public"."movement_templates" USING "btree" ("user_id");



CREATE INDEX "idx_movements_account_id" ON "public"."movements" USING "btree" ("account_id");



CREATE INDEX "idx_movements_displayed_date" ON "public"."movements" USING "btree" ("displayed_date");



CREATE INDEX "idx_movements_is_orphaned" ON "public"."movements" USING "btree" ("is_orphaned") WHERE ("is_orphaned" = true);



CREATE INDEX "idx_movements_pocket_id" ON "public"."movements" USING "btree" ("pocket_id");



CREATE INDEX "idx_movements_user_id" ON "public"."movements" USING "btree" ("user_id");



CREATE INDEX "idx_net_worth_snapshots_user_date" ON "public"."net_worth_snapshots" USING "btree" ("user_id", "snapshot_date" DESC);



CREATE INDEX "idx_pockets_account_id" ON "public"."pockets" USING "btree" ("account_id");



CREATE INDEX "idx_pockets_user_id" ON "public"."pockets" USING "btree" ("user_id");



CREATE INDEX "idx_reminder_exceptions_reminder_id" ON "public"."reminder_exceptions" USING "btree" ("reminder_id");



CREATE INDEX "idx_reminders_due_date" ON "public"."reminders" USING "btree" ("due_date");



CREATE INDEX "idx_reminders_is_paid" ON "public"."reminders" USING "btree" ("is_paid");



CREATE INDEX "idx_reminders_user_id" ON "public"."reminders" USING "btree" ("user_id");



CREATE INDEX "idx_settings_user_id" ON "public"."settings" USING "btree" ("user_id");



CREATE INDEX "idx_stock_prices_last_updated" ON "public"."stock_prices" USING "btree" ("last_updated");



CREATE INDEX "idx_stock_prices_symbol" ON "public"."stock_prices" USING "btree" ("symbol");



CREATE INDEX "idx_sub_pockets_group_id" ON "public"."sub_pockets" USING "btree" ("group_id");



CREATE INDEX "idx_sub_pockets_pocket_id" ON "public"."sub_pockets" USING "btree" ("pocket_id");



CREATE INDEX "idx_sub_pockets_user_id" ON "public"."sub_pockets" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_account_balance_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."pockets" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_account_balance"();



CREATE OR REPLACE TRIGGER "update_fixed_expense_groups_timestamp" BEFORE UPDATE ON "public"."fixed_expense_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_fixed_expense_groups_updated_at"();



CREATE OR REPLACE TRIGGER "update_investment_api_calls_timestamp" BEFORE UPDATE ON "public"."investment_api_calls" FOR EACH ROW EXECUTE FUNCTION "public"."update_investment_api_calls_updated_at"();



CREATE OR REPLACE TRIGGER "update_pocket_balance_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."movements" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_pocket_balance"();



CREATE OR REPLACE TRIGGER "update_stock_prices_timestamp" BEFORE UPDATE ON "public"."stock_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_stock_prices_last_updated"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_entries"
    ADD CONSTRAINT "budget_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fixed_expense_groups"
    ADD CONSTRAINT "fixed_expense_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movement_templates"
    ADD CONSTRAINT "movement_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movements"
    ADD CONSTRAINT "movements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."movements"
    ADD CONSTRAINT "movements_pocket_id_fkey" FOREIGN KEY ("pocket_id") REFERENCES "public"."pockets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."movements"
    ADD CONSTRAINT "movements_sub_pocket_id_fkey" FOREIGN KEY ("sub_pocket_id") REFERENCES "public"."sub_pockets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."movements"
    ADD CONSTRAINT "movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."net_worth_snapshots"
    ADD CONSTRAINT "net_worth_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pockets"
    ADD CONSTRAINT "pockets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pockets"
    ADD CONSTRAINT "pockets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_exceptions"
    ADD CONSTRAINT "reminder_exceptions_linked_movement_id_fkey" FOREIGN KEY ("linked_movement_id") REFERENCES "public"."movements"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reminder_exceptions"
    ADD CONSTRAINT "reminder_exceptions_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_fixed_expense_id_fkey" FOREIGN KEY ("fixed_expense_id") REFERENCES "public"."sub_pockets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_linked_movement_id_fkey" FOREIGN KEY ("linked_movement_id") REFERENCES "public"."movements"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."movement_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sub_pockets"
    ADD CONSTRAINT "sub_pockets_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."fixed_expense_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sub_pockets"
    ADD CONSTRAINT "sub_pockets_pocket_id_fkey" FOREIGN KEY ("pocket_id") REFERENCES "public"."pockets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sub_pockets"
    ADD CONSTRAINT "sub_pockets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to insert stock prices" ON "public"."stock_prices" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read API call counts" ON "public"."investment_api_calls" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read stock prices" ON "public"."stock_prices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to track API calls" ON "public"."investment_api_calls" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update API calls" ON "public"."investment_api_calls" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update stock prices" ON "public"."stock_prices" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Users can delete own templates" ON "public"."movement_templates" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own accounts" ON "public"."accounts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own budget_entries" ON "public"."budget_entries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own fixed expense groups" ON "public"."fixed_expense_groups" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own movements" ON "public"."movements" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own pockets" ON "public"."pockets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reminders" ON "public"."reminders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sub_pockets" ON "public"."sub_pockets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own templates" ON "public"."movement_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own accounts" ON "public"."accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own budget_entries" ON "public"."budget_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own fixed expense groups" ON "public"."fixed_expense_groups" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own movements" ON "public"."movements" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own pockets" ON "public"."pockets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own reminders" ON "public"."reminders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own settings" ON "public"."settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own sub_pockets" ON "public"."sub_pockets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own snapshots" ON "public"."net_worth_snapshots" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own fixed expense groups" ON "public"."fixed_expense_groups" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own templates" ON "public"."movement_templates" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own accounts" ON "public"."accounts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own budget_entries" ON "public"."budget_entries" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own fixed expense groups" ON "public"."fixed_expense_groups" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own movements" ON "public"."movements" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pockets" ON "public"."pockets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own reminders" ON "public"."reminders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own sub_pockets" ON "public"."sub_pockets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own templates" ON "public"."movement_templates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own accounts" ON "public"."accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own budget_entries" ON "public"."budget_entries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own fixed expense groups" ON "public"."fixed_expense_groups" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own movements" ON "public"."movements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own pockets" ON "public"."pockets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reminders" ON "public"."reminders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own settings" ON "public"."settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sub_pockets" ON "public"."sub_pockets" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fixed_expense_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investment_api_calls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."movement_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."net_worth_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pockets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sub_pockets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."calculate_account_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_account_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_account_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_pocket_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pocket_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pocket_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_investment_api_calls"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_investment_api_calls"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_investment_api_calls"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_stock_prices"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_stock_prices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_stock_prices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_fixed_expense_groups_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_fixed_expense_groups_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fixed_expense_groups_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_investment_api_calls_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_investment_api_calls_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investment_api_calls_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_stock_prices_last_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_stock_prices_last_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stock_prices_last_updated"() TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."budget_entries" TO "anon";
GRANT ALL ON TABLE "public"."budget_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_entries" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."fixed_expense_groups" TO "anon";
GRANT ALL ON TABLE "public"."fixed_expense_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."fixed_expense_groups" TO "service_role";



GRANT ALL ON TABLE "public"."investment_api_calls" TO "anon";
GRANT ALL ON TABLE "public"."investment_api_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_api_calls" TO "service_role";



GRANT ALL ON TABLE "public"."movement_templates" TO "anon";
GRANT ALL ON TABLE "public"."movement_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."movement_templates" TO "service_role";



GRANT ALL ON TABLE "public"."movements" TO "anon";
GRANT ALL ON TABLE "public"."movements" TO "authenticated";
GRANT ALL ON TABLE "public"."movements" TO "service_role";



GRANT ALL ON TABLE "public"."net_worth_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."net_worth_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."net_worth_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."pockets" TO "anon";
GRANT ALL ON TABLE "public"."pockets" TO "authenticated";
GRANT ALL ON TABLE "public"."pockets" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."reminder_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."reminder_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."stock_prices" TO "anon";
GRANT ALL ON TABLE "public"."stock_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_prices" TO "service_role";



GRANT ALL ON TABLE "public"."sub_pockets" TO "anon";
GRANT ALL ON TABLE "public"."sub_pockets" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_pockets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































