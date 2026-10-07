-- Dados iniciais (seção 5) + parâmetros de pontuação (seção 6).
-- Rodar depois de 0001_init.sql e 0002_closed_month_triggers.sql.
--
-- Os links iCal NÃO ficam aqui: people.ical_url permanece null e é preenchido
-- à mão no SQL Editor (ou em /config), para nunca entrar no repositório.
--
-- Seguro de rodar mais de uma vez: pessoas e parâmetros usam on conflict e as
-- tarefas só são inseridas se a tabela estiver vazia.

insert into people (id, slug, name, is_adult, color, photo_path, photo_focus, exam_keywords) values
  (1, 'pedro',   'Pedro',   false, '#2f6bff', '/people/Pedro.jpeg',   '50% 25%', '{prova}'),
  (2, 'vania',   'Vania',   true,  '#ff4d7e', '/people/Vania.jpeg',   '50% 50%', '{}'),
  (3, 'rodrigo', 'Rodrigo', true,  '#14b8a6', '/people/Rodrigo.jpeg', '50% 30%', '{}')
on conflict (id) do nothing;

-- Tarefas válidas desde o dia 1 do mês corrente em America/Sao_Paulo.
with params as (
  select date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date as valid_from
),
seed (person_slug, title, icon, image_path, period, weight, kind, weekdays, month_day, lead_days, sort_order) as (
  values
    -- Pedro
    ('pedro',   'Arrumar a cama',                     '🛏️', null::text,          'morning'::task_period,   1::smallint, 'daily'::recurrence_kind, null::smallint[],                   null::smallint, 0::smallint, 10::smallint),
    ('pedro',   'Arrumar a mesa (café)',              '🍽️', null,                'morning',                1,           'daily',                  null,                               null,           0,           20),
    ('pedro',   'Tirar a mesa (café)',                '🧽', null,                'morning',                1,           'daily',                  null,                               null,           0,           30),
    ('pedro',   'Atualizar agenda',                   '📒', null,                'afternoon',              1,           'weekly',                 '{1,2,3,4,5}',                      null,           0,           40),
    ('pedro',   'Tarefas + Kumon',                    '📚', null,                'afternoon',              3,           'weekly',                 '{1,2,3,4,5}',                      null,           0,           50),
    ('pedro',   'Lavar e estender toalhas',           '🧺', null,                'anytime',                2,           'weekly',                 '{2,5}',                            null,           0,           60),
    ('pedro',   'Passear com o Pingo',                '🐶', '/pingo.jpeg',        'anytime',                2,           'weekly',                 '{1,3,5}',                          null,           0,           70),
    ('pedro',   'Guardar Everest',                    '🏔️', '/guardar-o-everest.png', 'anytime',                1,           'daily',                  null,                               null,           0,           80),
    ('pedro',   'Guardar louça',                      '🥣', null,                'anytime',                1,           'daily',                  null,                               null,           0,           90),
    ('pedro',   'Arrumar a mesa (jantar)',            '🍽️', null,                'evening',                1,           'daily',                  null,                               null,           0,          100),
    ('pedro',   'Tirar a mesa (jantar)',              '🧽', null,                'evening',                1,           'daily',                  null,                               null,           0,          110),
    ('pedro',   'Arrumar a mochila',                  '🎒', null,                'evening',                1,           'daily',                  null,                               null,           0,          120),
    ('pedro',   'Guardar 5 coisas',                   '🖐️', null,                'anytime',                1,           'daily',                  null,                               null,           0,          130),
    ('pedro',   'Atividade física (40 min ou mais)',  '🏃', null,                'anytime',                2,           'weekly',                 '{1,2,3,4,5}',                      null,           0,          140),
    ('pedro',   'Estudar 40 min (véspera de prova)',  '📝', null,                'anytime',                2,           'exam_eve',               null,                               null,           0,          150),

    -- Vania
    ('vania',   'Arrumar a cama',                     '🛏️', null,                'morning',                1,           'daily',                  null,                               null,           0,           10),
    ('vania',   'Cozinhar',                           '🍳', null,                'anytime',                3,           'daily',                  null,                               null,           0,           20),
    ('vania',   'Roupa',                              '👕', null,                'anytime',                2,           'daily',                  null,                               null,           0,           30),
    ('vania',   'Guardar Everest',                    '🏔️', '/guardar-o-everest.png', 'anytime',                1,           'daily',                  null,                               null,           0,           40),
    ('vania',   'Guardar 5 coisas',                   '🖐️', null,                'anytime',                1,           'daily',                  null,                               null,           0,           50),
    ('vania',   'Atividade física (40 min ou mais)',  '🏃', null,                'anytime',                2,           'weekly',                 '{1,2,3,4,5}',                      null,           0,           60),
    ('vania',   'Pagar contas',                       '💸', null,                'anytime',                2,           'monthly',                null,                               1,              3,           70),

    -- Rodrigo
    ('rodrigo', 'Arrumar a cama',                     '🛏️', null,                'morning',                1,           'daily',                  null,                               null,           0,           10),
    ('rodrigo', 'Atividade física (40 min ou mais)',  '🏃', null,                'anytime',                2,           'weekly',                 '{1,2,3,4,5}',                      null,           0,           20),
    ('rodrigo', 'Tirar o lixo',                       '🗑️', null,                'anytime',                1,           'weekly',                 '{2,6}',                            null,           0,           30),
    ('rodrigo', 'Louça do dia',                       '🫧', null,                'evening',                2,           'daily',                  null,                               null,           0,           40),
    ('rodrigo', 'Limpar pia e fogão',                 '✨', null,                'evening',                2,           'daily',                  null,                               null,           0,           50),
    ('rodrigo', 'Passear com o Pingo',                '🐶', '/pingo.jpeg',        'anytime',                2,           'weekly',                 '{2,4,6,7}',                        null,           0,           60),
    ('rodrigo', 'Comprar pão',                        '🥖', null,                'morning',                1,           'weekly',                 '{1,2,3,4,5}',                      null,           0,           70),
    ('rodrigo', 'Guardar Everest',                    '🏔️', '/guardar-o-everest.png', 'anytime',                1,           'daily',                  null,                               null,           0,           80),
    ('rodrigo', 'Guardar 5 coisas',                   '🖐️', null,                'anytime',                1,           'daily',                  null,                               null,           0,           90),
    ('rodrigo', 'Pagar contas',                       '💸', null,                'anytime',                2,           'monthly',                null,                               7,              3,          100),
    ('rodrigo', 'Pagar condomínio',                   '🏢', null,                'anytime',                2,           'monthly',                null,                               12,             3,          110)
)
insert into tasks (person_id, title, icon, image_path, period, weight, kind, weekdays, month_day, lead_days, valid_from, sort_order)
select p.id, s.title, s.icon, s.image_path, s.period, s.weight, s.kind, s.weekdays, s.month_day, s.lead_days, params.valid_from, s.sort_order
from seed s
join people p on p.slug = s.person_slug
cross join params
where not exists (select 1 from tasks);

-- Parâmetros (seção 6).
insert into settings (key, value) values
  ('favor_bonus',           '1'::jsonb),
  ('report_penalty',        '2'),
  ('extra_max',             '3'),
  ('retro_deadline_hour',   '23'),
  ('monthly_lead_days',     '3'),
  ('sound_enabled',         'true'),
  ('quiet_hours',           '{"from": 22, "to": 7}'),
  ('idle_rotation_seconds', '120')
on conflict (key) do nothing;
