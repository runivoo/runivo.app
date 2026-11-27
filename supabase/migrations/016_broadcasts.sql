-- Email broadcasts from Runivo Studio (Admin PRD, phase 5).
--
-- A broadcast is written in Studio and sent through Resend's marketing feature: its
-- recipients are copied into a Resend segment, then Resend sends it, adds the
-- unsubscribe link and skips anyone who has unsubscribed. This table is Studio's own
-- record (draft, sending, sent). Server only: no policies, the service role reads it.

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  subject             text NOT NULL,
  preheader           text,
  heading             text NOT NULL,
  body                text NOT NULL,                -- plain text; blank lines become paragraphs
  button_label        text,
  button_url          text,
  audience            jsonb NOT NULL DEFAULT '{"kind":"waitlist"}',   -- {kind, city?, platform?}
  status              text NOT NULL DEFAULT 'draft',
  recipients          integer,
  synced              integer NOT NULL DEFAULT 0,  -- recipients copied to Resend so far
  resend_segment_id   text,
  resend_broadcast_id text,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  CONSTRAINT broadcasts_status_check CHECK (status IN ('draft', 'syncing', 'sent', 'failed')),
  CONSTRAINT broadcasts_name_len     CHECK (length(name) BETWEEN 1 AND 100),
  CONSTRAINT broadcasts_subject_len  CHECK (length(subject) BETWEEN 1 AND 150),
  CONSTRAINT broadcasts_heading_len  CHECK (length(heading) BETWEEN 1 AND 120),
  CONSTRAINT broadcasts_body_len     CHECK (length(body) BETWEEN 1 AND 10000),
  CONSTRAINT broadcasts_button_url   CHECK (button_url IS NULL OR button_url ~ '^https://')
);
CREATE INDEX IF NOT EXISTS broadcasts_created_idx ON public.broadcasts (created_at DESC);
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.broadcasts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.broadcasts TO service_role;
