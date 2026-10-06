-- Reforço no banco da regra "mês fechado é imutável" (seção 6).
-- As Server Actions já recusam datas de meses fechados; estes triggers são a rede
-- de segurança para task_occurrences, extras, reports e votes.
--
-- Erros são lançados com SQLSTATE 'MC001' (classe de usuário) para a camada de
-- dados mapear em { ok: false, code: 'MONTH_CLOSED' } sem expor detalhes do banco.
--
-- Atenção ao fechar o mês: dentro da transação de closeMonth, resolva as
-- pendências do último dia ANTES de inserir a linha em month_results, senão
-- estes triggers bloqueiam a própria gravação.

create or replace function is_month_closed(d date)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from month_results mr
    where mr.month = date_trunc('month', d)::date
  );
$$;

create or replace function assert_month_open(d date, what text)
  returns void
  language plpgsql
  stable
  security definer
  set search_path = public, pg_temp
as $$
begin
  if d is not null and is_month_closed(d) then
    raise exception using
      errcode = 'MC001',
      message = format('O mês %s já está fechado.', to_char(d, 'MM/YYYY')),
      detail  = format('alvo=%s data=%s', what, d),
      hint    = 'Meses fechados são imutáveis: reabrir exige apagar a linha em month_results.';
  end if;
end;
$$;

-- task_occurrences: a data da ocorrência é due_date.
create or replace function tg_task_occurrences_open_month()
  returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform assert_month_open(old.due_date, 'task_occurrences.due_date');
    return old;
  end if;

  perform assert_month_open(new.due_date, 'task_occurrences.due_date');

  if tg_op = 'UPDATE' then
    perform assert_month_open(old.due_date, 'task_occurrences.due_date');
  end if;

  return new;
end;
$$;

create trigger task_occurrences_open_month
  before insert or update or delete on task_occurrences
  for each row execute function tg_task_occurrences_open_month();

-- extras: a data do extra é happened_on.
create or replace function tg_extras_open_month()
  returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform assert_month_open(old.happened_on, 'extras.happened_on');
    return old;
  end if;

  perform assert_month_open(new.happened_on, 'extras.happened_on');

  if tg_op = 'UPDATE' then
    perform assert_month_open(old.happened_on, 'extras.happened_on');
  end if;

  return new;
end;
$$;

create trigger extras_open_month
  before insert or update or delete on extras
  for each row execute function tg_extras_open_month();

-- reports: happened_on é o mês da dedurada; due_date, quando presente, é a
-- ocorrência contestada e também precisa estar em mês aberto.
create or replace function tg_reports_open_month()
  returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform assert_month_open(old.happened_on, 'reports.happened_on');
    perform assert_month_open(old.due_date,    'reports.due_date');
    return old;
  end if;

  perform assert_month_open(new.happened_on, 'reports.happened_on');
  perform assert_month_open(new.due_date,    'reports.due_date');

  if tg_op = 'UPDATE' then
    perform assert_month_open(old.happened_on, 'reports.happened_on');
    perform assert_month_open(old.due_date,    'reports.due_date');
  end if;

  return new;
end;
$$;

create trigger reports_open_month
  before insert or update or delete on reports
  for each row execute function tg_reports_open_month();

-- votes: o voto herda o mês do extra ou da dedurada votada.
create or replace function target_month_date(p_kind text, p_id uuid)
  returns date
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select case p_kind
    when 'extra'  then (select e.happened_on from extras  e where e.id = p_id)
    when 'report' then (select r.happened_on from reports r where r.id = p_id)
  end;
$$;

create or replace function tg_votes_open_month()
  returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform assert_month_open(target_month_date(old.target_kind, old.target_id), 'votes');
    return old;
  end if;

  perform assert_month_open(target_month_date(new.target_kind, new.target_id), 'votes');

  if tg_op = 'UPDATE' then
    perform assert_month_open(target_month_date(old.target_kind, old.target_id), 'votes');
  end if;

  return new;
end;
$$;

create trigger votes_open_month
  before insert or update or delete on votes
  for each row execute function tg_votes_open_month();
