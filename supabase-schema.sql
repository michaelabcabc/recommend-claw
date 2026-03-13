-- ============================================================
-- Recommend Claw — Supabase 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行此文件
-- ============================================================

-- 1. profiles 表
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- 2. goals 表
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  category text,
  motivation text,
  daily_minutes integer default 30,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.goals enable row level security;
create policy "Users can manage own goals"
  on public.goals for all using (auth.uid() = user_id);

-- 3. tasks 表
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  date date not null,
  day_number integer default 1,
  title text not null,
  type text not null check (type in ('action', 'content')),
  duration text,
  badge text,
  concept text,
  content jsonb,
  done boolean default false,
  done_at timestamptz,
  created_at timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "Users can manage own tasks"
  on public.tasks for all using (auth.uid() = user_id);

-- 4. streaks 表
create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_active_date date,
  updated_at timestamptz default now()
);
alter table public.streaks enable row level security;
create policy "Users can manage own streak"
  on public.streaks for all using (auth.uid() = user_id);

-- 5. chat_sessions 表
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.chat_sessions enable row level security;
create policy "Users can manage own chat sessions"
  on public.chat_sessions for all using (auth.uid() = user_id);

-- 6. chat_messages 表
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);
alter table public.chat_messages enable row level security;
create policy "Users can manage own messages"
  on public.chat_messages for all using (auth.uid() = user_id);

-- 7. daily_summaries 表
create table if not exists public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  date date not null,
  content text not null,
  created_at timestamptz default now()
);
alter table public.daily_summaries enable row level security;
create policy "Users can manage own summaries"
  on public.daily_summaries for all using (auth.uid() = user_id);

-- ============================================================
-- 自动创建 profile + streak（用户注册时触发）
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;

  insert into public.streaks (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
