-- Fechamento de mês (seção 7.7, T12): grava month_results e month_scores em
-- uma única transação. Uma função plpgsql já é transacional por natureza —
-- se qualquer insert falhar (ex.: o mês já foi fechado, violando a chave
-- primária de month_results), nada é gravado.
--
-- Rodar depois de 0001_init.sql e 0002_closed_month_triggers.sql.

create or replace function close_month(
  p_month date,
  p_closed_by smallint,
  p_summary jsonb,
  p_scores jsonb -- array de {person_id, task_pct, bonus, penalty, total, rank, badges}
)
  returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_score jsonb;
begin
  insert into month_results (month, closed_by, summary)
  values (p_month, p_closed_by, p_summary);

  for v_score in select * from jsonb_array_elements(p_scores)
  loop
    insert into month_scores (month, person_id, task_pct, bonus, penalty, total, rank, badges)
    values (
      p_month,
      (v_score ->> 'person_id')::smallint,
      (v_score ->> 'task_pct')::numeric,
      (v_score ->> 'bonus')::numeric,
      (v_score ->> 'penalty')::numeric,
      (v_score ->> 'total')::numeric,
      (v_score ->> 'rank')::smallint,
      coalesce(
        (select array_agg(badge) from jsonb_array_elements_text(v_score -> 'badges') as badge),
        '{}'
      )
    );
  end loop;
end;
$$;
