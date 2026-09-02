ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_target_type_check;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_target_type_check
  CHECK (target_type IN ('PROVIDER','REVIEW','MESSAGE','USER','PORTFOLIO','PROPERTY'));

ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_target_type_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_target_type_check
  CHECK (target_type IN ('PROVIDER','DEAL','EVENT','PROJECT','FREELANCER','PROPERTY'));