-- MCP OAuth 2.1 (ChatGPT connector) storage.
--
-- Additive only: three new, empty tables. Nothing existing is modified.
-- Every secret column holds a SHA-256 hex digest; raw tokens, codes and
-- consent-request handles are never stored.
--
-- RLS is enabled with NO policies and table privileges are revoked from the
-- anon/authenticated roles, so only the backend (service key) can touch them.

CREATE TABLE IF NOT EXISTS mcp_oauth_grants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id     TEXT NOT NULL,
    scope         TEXT NOT NULL,
    resource      TEXT NOT NULL,
    issuer        TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at  TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_grants_user_active
    ON mcp_oauth_grants (user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS mcp_oauth_authorizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle_hash     TEXT NOT NULL UNIQUE,
    client_id       TEXT NOT NULL,
    redirect_uri    TEXT NOT NULL,
    state           TEXT,
    code_challenge  TEXT NOT NULL,
    scope           TEXT NOT NULL,
    resource        TEXT NOT NULL,
    issuer          TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'denied', 'used')),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash       TEXT UNIQUE,
    grant_id        UUID REFERENCES mcp_oauth_grants(id) ON DELETE SET NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_authorizations_expires
    ON mcp_oauth_authorizations (expires_at);

CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
    token_hash  TEXT PRIMARY KEY,
    grant_id    UUID NOT NULL REFERENCES mcp_oauth_grants(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_grant ON mcp_oauth_tokens (grant_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_expires ON mcp_oauth_tokens (expires_at);

ALTER TABLE mcp_oauth_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON mcp_oauth_grants, mcp_oauth_authorizations, mcp_oauth_tokens FROM anon, authenticated;

COMMENT ON TABLE mcp_oauth_grants IS 'One row per ChatGPT connection (OAuth grant). revoked_at kills all its tokens.';
COMMENT ON TABLE mcp_oauth_authorizations IS 'Pending consent requests and single-use authorization codes (hashed).';
COMMENT ON TABLE mcp_oauth_tokens IS 'Hashed access/refresh tokens. used_at marks rotated refresh tokens for reuse detection.';
