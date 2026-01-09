-- Insert default payment mode setting
INSERT INTO public.site_settings (key, value)
VALUES ('payment_mode', '{"mode": "test", "test_environment": "web"}'::jsonb)
ON CONFLICT (key) DO NOTHING;