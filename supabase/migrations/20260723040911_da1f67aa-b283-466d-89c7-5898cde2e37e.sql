select cron.unschedule('library-gen-batch');

select cron.schedule(
  'library-gen-batch',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://doseroutine.com/api/public/admin/generate-library?mode=repair&fields=structure_image_url,sources_md,side_effects_md,warnings_md,contraindications_md,do_not_mix_md,timing_md,faq_md&limit=15',
    headers := jsonb_build_object('Content-Type','application/json','x-admin-secret','sw_libgen_2f8b9c1a4d6e7f0b3c5a8d2e9f1b4c7a'),
    body := '{}'::jsonb,
    timeout_milliseconds := 280000
  );
  $$
);