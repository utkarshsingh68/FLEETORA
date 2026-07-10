# Fleetora Supabase setup

1. In the Supabase dashboard, open the SQL Editor for the Fleetora project.
2. Run `supabase/migrations/20260710170000_fleetora_core.sql` once.
3. In **Authentication → URL Configuration**, add your local Fleetora URL and deployed Fleetora URL as redirect URLs.
4. In **Authentication → Providers**, enable Email. Configure email confirmation according to your onboarding preference.

The migration creates Fleetora's core tables, a private documents bucket, company-level row-level security, and the workspace bootstrap function used during registration.
