CREATE TABLE cash_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(12,2),
  notes         TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'closed')),
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ
);

CREATE INDEX idx_cash_sessions_user_id   ON cash_sessions(user_id);
CREATE INDEX idx_cash_sessions_opened_at ON cash_sessions(opened_at);
