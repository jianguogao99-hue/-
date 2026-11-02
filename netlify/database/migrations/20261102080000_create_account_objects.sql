CREATE TABLE account_objects (
  account_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  payload TEXT NOT NULL,
  etag TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, object_key)
);
