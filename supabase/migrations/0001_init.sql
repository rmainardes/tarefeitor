create type task_period       as enum ('morning', 'afternoon', 'evening', 'anytime');
create type recurrence_kind   as enum ('daily', 'weekly', 'monthly', 'once', 'exam_eve');
create type occurrence_status as enum ('done', 'missed', 'covered', 'excused');

create table people (
  id            smallint primary key,
  slug          text not null unique,
  name          text not null,
  is_adult      boolean not null,
  color         text not null,
  photo_path    text not null,
  photo_focus   text not null default '50% 30%',
  ical_url      text,                               -- nunca sai do servidor
  exam_keywords text[] not null default '{}'        -- ex.: {'prova'}
);

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  person_id   smallint not null references people(id),
  title       text not null check (char_length(title) between 1 and 80),
  icon        text not null default '✅',
  image_path  text,
  period      task_period not null default 'anytime',
  weight      smallint not null default 1 check (weight between 1 and 3),
  kind        recurrence_kind not null,
  weekdays    smallint[],                           -- ISO 1..7, para kind = 'weekly'
  month_day   smallint check (month_day between 1 and 31),
  once_date   date,
  lead_days   smallint not null default 0 check (lead_days between 0 and 7),
  valid_from  date not null,
  valid_to    date,
  sort_order  smallint not null default 0,
  created_by  smallint references people(id),
  created_at  timestamptz not null default now(),
  check (kind <> 'weekly'  or (weekdays is not null and weekdays <@ array[1,2,3,4,5,6,7]::smallint[])),
  check (kind <> 'monthly' or month_day is not null),
  check (kind <> 'once'    or once_date is not null),
  check (valid_to is null or valid_to >= valid_from)
);
create index tasks_person_idx on tasks (person_id, valid_from, valid_to);

-- Só existe linha quando alguém marcou algo. Sem linha = pendente.
create table task_occurrences (
  task_id    uuid not null references tasks(id),
  due_date   date not null,
  status     occurrence_status not null,
  done_by    smallint references people(id),        -- diferente do dono quando 'covered'
  marked_by  smallint not null references people(id),
  marked_at  timestamptz not null default now(),
  note       text check (char_length(note) <= 280),
  primary key (task_id, due_date)
);
create index task_occurrences_date_idx on task_occurrences (due_date);

create table exam_eves (
  person_id   smallint not null references people(id),
  eve_date    date not null,
  exam_date   date not null,
  event_uid   text not null,
  event_title text not null,
  primary key (person_id, eve_date, event_uid)
);

create table extras (
  id          uuid primary key default gen_random_uuid(),
  author_id   smallint not null references people(id),
  description text not null check (char_length(description) between 1 and 280),
  happened_on date not null,
  created_at  timestamptz not null default now()
);

create table reports (                              -- "Dedurando"
  id          uuid primary key default gen_random_uuid(),
  author_id   smallint not null references people(id),
  accused_id  smallint not null references people(id),
  description text not null check (char_length(description) between 1 and 280),
  defense     text check (char_length(defense) <= 280),
  task_id     uuid references tasks(id),            -- preenchido na contestação
  due_date    date,
  happened_on date not null,
  created_at  timestamptz not null default now(),
  check (author_id <> accused_id),
  check ((task_id is null) = (due_date is null))
);

create table votes (
  target_kind text not null check (target_kind in ('extra', 'report')),
  target_id   uuid not null,
  voter_id    smallint not null references people(id),
  value       smallint not null check (value between 0 and 3),  -- extra: 0..3; report: 0 = improcedente, 1 = procede
  voted_at    timestamptz not null default now(),
  primary key (target_kind, target_id, voter_id)
);

create table days_off (
  id         uuid primary key default gen_random_uuid(),
  person_id  smallint not null references people(id),
  date_from  date not null,
  date_to    date not null,
  task_id    uuid references tasks(id),             -- null = todas as tarefas da pessoa
  reason     text check (char_length(reason) <= 120),
  check (date_to >= date_from)
);

create table birthdays (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  day        smallint not null check (day between 1 and 31),
  month      smallint not null check (month between 1 and 12),
  birth_year smallint
);

create table settings (
  key   text primary key,
  value jsonb not null
);

create table month_results (
  month      date primary key check (extract(day from month) = 1),
  closed_at  timestamptz not null default now(),
  closed_by  smallint references people(id),
  punishment text,                                  -- resultado da roleta
  summary    jsonb not null                         -- fotografia completa: itens votados, parâmetros usados
);

create table month_scores (
  month     date not null references month_results(month),
  person_id smallint not null references people(id),
  task_pct  numeric(5,2) not null,
  bonus     numeric(5,2) not null,
  penalty   numeric(5,2) not null,
  total     numeric(6,2) not null,
  rank      smallint not null check (rank between 1 and 3),
  badges    text[] not null default '{}',
  primary key (month, person_id)
);

create table audit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  actor_id  smallint references people(id),         -- pessoa selecionada no dispositivo (autodeclarada)
  action    text not null,
  entity    text not null,
  entity_id text,
  payload   jsonb
);

alter table people           enable row level security;
alter table tasks            enable row level security;
alter table task_occurrences enable row level security;
alter table exam_eves        enable row level security;
alter table extras           enable row level security;
alter table reports          enable row level security;
alter table votes            enable row level security;
alter table days_off         enable row level security;
alter table birthdays        enable row level security;
alter table settings         enable row level security;
alter table month_results    enable row level security;
alter table month_scores     enable row level security;
alter table audit_log        enable row level security;
