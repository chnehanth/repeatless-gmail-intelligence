-- Demo mode: mark a seeded showcase user so the app can offer a no-Google
-- "Explore the demo" experience and guard it from real-Gmail side effects
-- (sync, send). Idempotent.
alter table users add column if not exists is_demo boolean not null default false;
