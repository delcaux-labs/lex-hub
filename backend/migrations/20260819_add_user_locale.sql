-- Add preferred_locale to user_profiles for interface and assistant i18n
alter table public.user_profiles
  add column if not exists preferred_locale text not null default 'fr';
