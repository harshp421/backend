-- UP
CREATE TYPE user_role     AS ENUM ('farmer', 'platform', 'org');
CREATE TYPE plot_status   AS ENUM ('submitted', 'verified', 'rejected');
CREATE TYPE credit_status AS ENUM ('issued', 'listed', 'sold', 'retired', 'reversed');
CREATE TYPE ledger_event  AS ENUM ('issued', 'listed', 'sold', 'retired');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          user_role NOT NULL,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  species         text NOT NULL,
  tree_count      integer NOT NULL CHECK (tree_count > 0),
  planting_date   date NOT NULL,
  estimate_tonnes numeric(12,4) NOT NULL,
  status          plot_status NOT NULL DEFAULT 'submitted',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id         uuid NOT NULL REFERENCES plots(id) ON DELETE RESTRICT,
  tonnes_issued   integer NOT NULL CHECK (tonnes_issued > 0),
  tier            text NOT NULL CHECK (tier IN ('A','B','C')),
  price_per_tonne numeric(12,2) NOT NULL,
  status          credit_status NOT NULL DEFAULT 'issued',
  owner_id        uuid REFERENCES users(id),
  certificate_id  text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id  uuid NOT NULL REFERENCES credits(id) ON DELETE RESTRICT,
  event      ledger_event NOT NULL,
  actor_id   uuid NOT NULL REFERENCES users(id),
  detail     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id       uuid NOT NULL REFERENCES credits(id) ON DELETE RESTRICT,
  farmer_id       uuid NOT NULL REFERENCES users(id),
  total_amount    numeric(14,2) NOT NULL,
  farmer_amount   numeric(14,2) NOT NULL,
  platform_amount numeric(14,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plots_status   ON plots(status);
CREATE INDEX idx_plots_farmer   ON plots(farmer_id);
CREATE INDEX idx_credits_status ON credits(status);
CREATE INDEX idx_credits_owner  ON credits(owner_id);
CREATE INDEX idx_ledger_credit  ON ledger_events(credit_id);
CREATE INDEX idx_payouts_farmer ON payouts(farmer_id);

-- Defense in depth: ledger_events is append-only at the DB layer too.
-- The application is forbidden from issuing UPDATE/DELETE; these triggers
-- enforce it even if a bug or rogue migration tries to.
CREATE OR REPLACE FUNCTION ledger_events_no_modify()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_events_no_update
  BEFORE UPDATE ON ledger_events
  FOR EACH ROW EXECUTE FUNCTION ledger_events_no_modify();

CREATE TRIGGER ledger_events_no_delete
  BEFORE DELETE ON ledger_events
  FOR EACH ROW EXECUTE FUNCTION ledger_events_no_modify();

-- DOWN
DROP TRIGGER IF EXISTS ledger_events_no_delete ON ledger_events;
DROP TRIGGER IF EXISTS ledger_events_no_update ON ledger_events;
DROP FUNCTION IF EXISTS ledger_events_no_modify();
DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS ledger_events;
DROP TABLE IF EXISTS credits;
DROP TABLE IF EXISTS plots;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS ledger_event;
DROP TYPE IF EXISTS credit_status;
DROP TYPE IF EXISTS plot_status;
DROP TYPE IF EXISTS user_role;
