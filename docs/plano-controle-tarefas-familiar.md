# Controle de Tarefas Familiar — Plano e Especificação Técnica

> Versão 1.0 — 05/10/2026
> App web para controlar as tarefas da casa como competição mensal por pontos entre Pedro, Vania e Rodrigo.
> Este documento é a fonte única de verdade para a implementação. Cada tarefa da seção 14 deve ser executada em uma sessão separada do CLI, lendo apenas as seções indicadas.

---

## 1. Visão geral

- **Painel 24/7** em um notebook antigo (Ubuntu, Chromium em modo kiosk) e acesso simultâneo pelo navegador do celular.
- **Três participantes**: Pedro (criança), Vania e Rodrigo (adultos).
- **Ciclo mensal**: tarefas diárias → placar ao vivo → julgamento de extras e deduradas → fechamento → cerimônia com prêmios e castigo.
- **Tom**: visual, divertido e vibrante, mas prático o suficiente para ser usado todos os dias em poucos toques.

### Fora do escopo desta versão

| Item | Situação |
|---|---|
| PWA instalável e notificações push | Em espera, sem previsão |
| Formatação do notebook, kiosk, detecção de movimento (daemon `motion` + DPMS) | Sessão separada, depois do app pronto |
| Autenticação / PIN por pessoa | Descartado por decisão (uso de confiança) |
| Agenda Google da Vania | Não integra (decisão) |

---

## 2. Decisões registradas

| # | Tema | Decisão |
|---|---|---|
| 1 | Pontuação | Peso por tarefa (1 a 3); placar em **% do possível**, para não favorecer quem tem mais tarefas |
| 2 | Extras e deduradas | Extra: votado pelos **outros dois** (nota 0 a 3). Dedurada: votada pelos **três**, com uma linha de defesa do acusado |
| 3 | Google Agenda | **Link iCal secreto** (somente leitura), sem OAuth. Apenas Pedro e Rodrigo |
| 4 | Agendamento | **Sem cron**. Guardam-se regras de recorrência e conclusões; as ocorrências são calculadas na leitura |
| 5 | Acesso | **Sem autenticação**. URL não divulgada, uso de confiança. Ver mitigações sem atrito na seção 11 |
| 6 | Burn-in | Detecção de movimento no sistema operacional (fora do app). No app, apenas pixel-shift e tema escuro noturno |
| 7 | Prazo | Tarefas do dia valem até o fim do dia, **sem meia pontuação por atraso**. O que for matutino ou específico é marcado manualmente como "não cumprida" |
| 8 | Marcação retroativa | Até as **23h do dia seguinte** |
| 9 | Folgas e edições pontuais | Existem, mas ficam **escondidas em Configurações** |
| 10 | Estudo em véspera de prova | Derivado da **agenda Google do Pedro**: evento de prova gera a tarefa de estudo na véspera |
| 11 | Ajuda entre pessoas | Sem troca de tarefas. Botão **"Fiz para o/a X"**, que rende ponto extra |
| 12 | Contestação | "Não fez direito" vira dedurada com um toque |
| 13 | Fechamento | Mês fechado é **imutável**, com histórico em "Hall da fama" |
| 14 | Sequências e medalhas | Adotado |
| 15 | Tempo real | Adotado, com **aviso sonoro** e confete |
| 16–17 | Cerimônia | 1º lugar: sorvete grande. 2º lugar: sorvete pequeno. 3º lugar: **roleta do castigo** |
| 18–19 | Notebook | Painel que alterna sozinho quando ocioso, mas com **inserção completa por teclado e mouse** (Pedro usa principalmente o notebook). Atalhos 1/2/3 e QR code |
| 21 | Aniversários | Adotado, com contagem regressiva e destaque no dia |
| 22 | Offline | Cache simples do último estado (baixo esforço) |
| — | Quem cria tarefas e define pesos | Adultos, por confiança (sem bloqueio técnico) |
| — | Figuras | Tarefas peculiares ("Guardar Everest", "Passear com o Pingo") ganham ilustração própria |

### Premissas adotadas por mim (confirmar ou ajustar)

1. **"Fiz para o/a X"**: quem fez ganha o bônus; a tarefa do dono fica **neutra** (sai do cálculo dele, nem soma nem desconta).
2. **Escala de bônus e penalidade**: 1 ponto = 1 ponto na escala de 0 a 100 do placar. Extra vale até +3, "Fiz para" vale +1, dedurada procedente vale −2. Tudo configurável.
3. **"Não cumprida" é direta** (sem votação, registrada no log). **"Não fez direito"** vai para julgamento.
4. **Pesos da seção 5** são proposta inicial.
5. **"Arrumar a mochila"** ficou em todos os dias, como na planilha.
6. Tarefas **mensais** (contas, condomínio) aparecem 3 dias antes do vencimento e podem ser concluídas antecipadamente.

---

## 3. Stack e dependências

Versões conferidas no npm em 05/10/2026. Usar a versão instalada pelo scaffolder e **consultar a documentação da versão instalada** antes de usar APIs que mudaram entre majors (cache, Server Actions, `proxy`/middleware).

| Camada | Escolha | Versão atual |
|---|---|---|
| Framework | Next.js (App Router, Server Components, Server Actions) | 16.3.x |
| UI | React | 19.3.x |
| Linguagem | TypeScript (strict) | 7.0.x |
| Estilo | Tailwind CSS | 4.3.x |
| Banco | Supabase (PostgreSQL), região `sa-east-1` (São Paulo) | — |
| Hospedagem | Vercel Hobby, funções na região `gru1` | — |
| Runtime | Node.js LTS (Next exige ≥ 20.9) | — |

### Bibliotecas externas (lista fechada)

Nenhuma outra dependência de runtime deve ser adicionada sem aprovação explícita.

| Pacote | Versão | Para quê | Alternativa sem dependência |
|---|---|---|---|
| `@supabase/supabase-js` | 2.117.x | Acesso ao banco no servidor e canal Realtime no cliente | Nenhuma razoável |
| `node-ical` | 0.27.x | Ler o iCal e expandir eventos recorrentes (RRULE) | Parser manual: não recomendado, RRULE é complexo |
| `canvas-confetti` | 1.9.x | Confete | Animação CSS própria (opcional trocar) |
| `vitest` (dev) | 5.0.x | Testes unitários do domínio | `node:test` nativo |

Sem dependência: validação de entrada (funções próprias), QR code (SVG estático em `/public`, a URL é fixa), fontes (`next/font`), sons (arquivos em `/public/sounds`), datas (`Intl` + funções próprias).

### Limites do plano gratuito que moldam o desenho

- **Vercel Hobby**: cron só uma vez por dia, com precisão de ±59 min. Por isso não há cron.
- **Supabase Free**: projeto pausa após 7 dias sem atividade (o painel 24/7 evita); 500 MB de banco; **sem backup automático** (ver exportação em Configurações).

---

## 4. Arquitetura

```
Navegador (notebook kiosk / celular)
   │  Server Components + Server Actions (HTTPS)
   ▼
Next.js na Vercel ──(secret key, só no servidor)──► Supabase Postgres
   │                                                    (RLS ligado, sem policies)
   ├──► iCal secreto do Google (fetch com cache de 10 min)
   └──► Supabase Realtime Broadcast (evento "changed", sem dados sensíveis)
                         │
Navegador ◄──────────────┘  (publishable key: só escuta o canal e refaz a leitura)
```

Princípios:

1. **Todo acesso a dados passa pelo servidor Next.** O navegador nunca consulta tabelas.
2. **Domínio em funções puras** (`lib/domain`), sem I/O, com testes: recorrência, pontuação, sequências, datas.
3. **Nada é materializado antes da hora.** Uma ocorrência só vira linha no banco quando alguém a marca. Ausência de linha = pendente (ou perdida, se o prazo passou).
4. **Fuso fixo** `America/Sao_Paulo` para todo cálculo de "dia" e "mês", sempre no servidor.

### Estrutura de pastas

```
app/
  layout.tsx                 fontes, tema, metadata noindex
  page.tsx                   Painel
  julgamento/page.tsx
  cerimonia/[month]/page.tsx
  hall-da-fama/page.tsx
  config/…                   tarefas, aniversários, agenda, folgas, edições, parâmetros, exportar
  actions/                   Server Actions (uma por caso de uso)
components/                  UI (PersonSwitcher, Scoreboard, TaskList, Roulette, …)
lib/
  domain/                    dates.ts, recurrence.ts, scoring.ts, streaks.ts, badges.ts (puro)
  data/                      repositórios (supabase-js, server-only)
  calendar/                  ical.ts, examEves.ts
  realtime/                  broadcast.ts (servidor), useLiveRefresh.ts (cliente)
  validation.ts
public/
  people/  punishments/  tasks/  sounds/  qr.svg
supabase/
  migrations/  seed.sql
tests/
```

### Variáveis de ambiente

| Nome | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente e servidor | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente | Antiga "anon key". Com RLS fechado não lê nenhuma tabela |
| `SUPABASE_SECRET_KEY` | **só servidor** | Antiga "service_role". Nunca usar prefixo `NEXT_PUBLIC_` |
| `APP_TIMEZONE` | servidor | `America/Sao_Paulo` |

Os links iCal ficam no banco (`people.ical_url`) e nunca são enviados ao cliente.

---

## 5. Dados iniciais (seed)

Fonte: `Agenda inicial.xlsx`. Dias da semana em ISO (1 = segunda … 7 = domingo). Períodos: manhã, tarde, noite, livre.

### Pessoas

| id | slug | Nome | Adulto | Agenda | Foto |
|---|---|---|---|---|---|
| 1 | `pedro` | Pedro | não | iCal + detecção de provas | `Pedro.jpeg` (576×1280) |
| 2 | `vania` | Vania | sim | — | `Vania.jpeg` (1254×1254) |
| 3 | `rodrigo` | Rodrigo | sim | iCal | `Rodrigo.jpeg` (1200×1600) |

Castigos: `Arlete.jpeg` (228×791, baixa resolução: usar em moldura pequena), `Nonna.jpeg` (960×1280), `Vanderlei.jpeg` (797×801).
As fotos têm proporções muito diferentes: usar `object-fit: cover` com ponto focal configurável por pessoa (`photo_focus`).

### Pedro

| Tarefa | Recorrência | Período | Peso | Figura |
|---|---|---|---|---|
| Arrumar a cama | diária | manhã | 1 | 🛏️ |
| Arrumar a mesa (café) | diária | manhã | 1 | 🍽️ |
| Tirar a mesa (café) | diária | manhã | 1 | 🧽 |
| Atualizar agenda | seg–sex | tarde | 1 | 📒 |
| Tarefas + Kumon | seg–sex | tarde | 3 | 📚 |
| Lavar e estender toalhas | ter, sex | livre | 2 | 🧺 |
| Passear com o Pingo | seg, qua, sex | livre | 2 | ilustração própria |
| Guardar Everest | diária | livre | 1 | ilustração própria (montanha de roupa) |
| Guardar louça | diária | livre | 1 | 🥣 |
| Arrumar a mesa (jantar) | diária | noite | 1 | 🍽️ |
| Tirar a mesa (jantar) | diária | noite | 1 | 🧽 |
| Arrumar a mochila | diária | noite | 1 | 🎒 |
| Guardar 5 coisas | diária | livre | 1 | 🖐️ |
| Atividade física (40 min ou mais) | seg–sex | livre | 2 | 🏃 |
| Estudar 40 min (véspera de prova) | `exam_eve` | livre | 2 | 📝 |

### Vania

| Tarefa | Recorrência | Período | Peso | Figura |
|---|---|---|---|---|
| Arrumar a cama | diária | manhã | 1 | 🛏️ |
| Cozinhar | diária | livre | 3 | 🍳 |
| Roupa | diária | livre | 2 | 👕 |
| Guardar Everest | diária | livre | 1 | ilustração própria |
| Guardar 5 coisas | diária | livre | 1 | 🖐️ |
| Atividade física (40 min ou mais) | seg–sex | livre | 2 | 🏃 |
| Pagar contas | mensal, dia 1 | livre | 2 | 💸 |

### Rodrigo

| Tarefa | Recorrência | Período | Peso | Figura |
|---|---|---|---|---|
| Arrumar a cama | diária | manhã | 1 | 🛏️ |
| Atividade física (40 min ou mais) | seg–sex | livre | 2 | 🏃 |
| Tirar o lixo | ter, sáb | livre | 1 | 🗑️ |
| Louça do dia | diária | noite | 2 | 🫧 |
| Limpar pia e fogão | diária | noite | 2 | ✨ |
| Passear com o Pingo | ter, qui, sáb, dom | livre | 2 | ilustração própria |
| Comprar pão | seg–sex | manhã | 1 | 🥖 |
| Guardar Everest | diária | livre | 1 | ilustração própria |
| Guardar 5 coisas | diária | livre | 1 | 🖐️ |
| Pagar contas | mensal, dia 7 | livre | 2 | 💸 |
| Pagar condomínio | mensal, dia 12 | livre | 2 | 🏢 |

---

## 6. Modelo de dados

Migração inicial (PostgreSQL / Supabase). RLS ligado em todas as tabelas e **nenhuma policy**: só a secret key do servidor acessa.

```sql
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
```

Notas:

- **Versionamento de tarefas**: mudar título, figura ou ordem é edição no lugar. Mudar peso, recorrência ou responsável encerra a versão atual (`valid_to = ontem`) e cria uma nova (`valid_from = hoje`), para não reescrever o passado.
- **Excluir tarefa** = preencher `valid_to`. Nunca apagar linhas com histórico.
- **Mês fechado**: toda Server Action de escrita rejeita datas cujo mês conste em `month_results`. Reforçar com trigger em `task_occurrences`, `extras`, `reports` e `votes`.
- **Parâmetros em `settings`** (valores iniciais): `favor_bonus = 1`, `report_penalty = 2`, `extra_max = 3`, `retro_deadline_hour = 23`, `monthly_lead_days = 3`, `sound_enabled = true`, `quiet_hours = {"from": 22, "to": 7}`, `idle_rotation_seconds = 120`.

---

## 7. Regras de negócio

### 7.1 Recorrência (`lib/domain/recurrence.ts`)

`isDue(task, date, examEves) → boolean`, considerando `valid_from ≤ date ≤ valid_to` e:

| `kind` | Devida quando |
|---|---|
| `daily` | todo dia |
| `weekly` | dia ISO da semana ∈ `weekdays` |
| `monthly` | dia do mês = `month_day`; se o mês for mais curto, vale o último dia |
| `once` | `date = once_date` |
| `exam_eve` | existe linha em `exam_eves` para a pessoa nessa data |

### 7.2 Estados de uma ocorrência

| Estado | Como chega | Efeito no placar |
|---|---|---|
| pendente | sem linha no banco, dentro do prazo | fora do cálculo |
| `done` | o dono marcou | soma o peso no numerador e no denominador |
| `covered` | outra pessoa usou "Fiz para" | fora do cálculo do dono; +`favor_bonus` para quem fez |
| `missed` | marcada "não cumprida", contestação procedente, ou prazo vencido sem marcação | soma o peso só no denominador |
| `excused` | folga cadastrada ou edição pontual | fora do cálculo |

**Prazo**: uma ocorrência com vencimento no dia D pode ser marcada até as 23h00 de D+1 (`retro_deadline_hour`). Depois disso, pendente é tratada como `missed` na leitura, sem gravar linha.

**Folga** (`days_off`) é calculada na leitura: ocorrência coberta por folga e sem linha é `excused`.

**Mensais**: aparecem na lista a partir de `lead_days` antes do vencimento, com o rótulo "vence dia X", e podem ser concluídas antes. A data da ocorrência continua sendo a do vencimento.

### 7.3 Placar (`lib/domain/scoring.ts`)

Para cada pessoa, no mês corrente:

```
task_pct = 100 × Σ peso(done) ÷ Σ peso(done + missed)        (0 se não houver ocorrência resolvida)
bonus    = Σ média dos dois votos de cada extra julgado       (0 a 3 por extra)
         + favor_bonus × nº de ocorrências 'covered' feitas por ela
penalty  = report_penalty × nº de deduradas procedentes contra ela
total    = task_pct + bonus − penalty
```

- Durante o mês, extras e deduradas ainda não julgados **não entram** no total; aparecem como "em julgamento" ao lado do placar.
- **Dedurada procedente**: 2 ou mais votos "procede" entre os três.
- **Contestação procedente** ("não fez direito"): a ocorrência passa de `done` para `missed`. Não soma `report_penalty` (a perda do peso já é a punição).
- O total pode passar de 100.
- **Desempate**: menos deduradas procedentes → maior sequência atual → sorteio na cerimônia.

### 7.4 Sequências e medalhas

- **Sequência (🔥)**: dias consecutivos com 100% das próprias tarefas devidas concluídas. Dia sem tarefa devida ou todo em folga não quebra nem soma.
- **Medalhas iniciais** (calculadas na leitura para o mês corrente e gravadas em `month_scores.badges` no fechamento):

| Código | Nome | Critério |
|---|---|---|
| `hotel_bed` | Cama de hotel | 30 dias seguidos de "Arrumar a cama" |
| `sherpa` | Sherpa do Everest | 14 dias seguidos de "Guardar Everest" |
| `pingo_bff` | Melhor amigo do Pingo | todos os passeios do mês |
| `perfect_week` | Semana perfeita | 7 dias seguidos com 100% |
| `helping_hand` | Mão na roda | 5 ou mais "Fiz para" no mês |
| `clean_record` | Ficha limpa | nenhuma dedurada procedente no mês |
| `snitch` | X-9 do mês | mais deduradas procedentes como autor |

### 7.5 Agenda Google (iCal)

- Buscar `people.ical_url` no servidor com cache de 10 minutos. Falha de rede: usar o último resultado e exibir "agenda desatualizada".
- Exibir **título, horário e marcação de dia inteiro**. Hoje e amanhã no painel; próximos 7 dias na visão da pessoa.
- **Véspera de prova (Pedro)**: evento cujo título contém alguma palavra de `exam_keywords` (sem diferenciar maiúsculas nem acentos; padrão `prova`) gera linha em `exam_eves` com `eve_date = exam_date − 1`.
  - A cada leitura da agenda: inserir vésperas futuras novas; remover vésperas **futuras** cujo evento sumiu; nunca alterar datas passadas.
  - Prova na segunda gera estudo no domingo.

### 7.6 Aniversários

Todos os aniversários do mês corrente aparecem no painel, ordenados por dia, com contagem regressiva ("faltam 3 dias"). No dia, destaque com animação. 29/02 em ano não bissexto é comemorado em 28/02.

### 7.7 Julgamento e fechamento

1. **Julgamento** abre no último dia do mês. Lista os extras e deduradas do mês.
   - Extra: os outros dois dão nota de 0 a 3.
   - Dedurada: o acusado pode escrever uma linha de defesa; os três votam "procede" ou "improcedente".
   - Cada um vota com a pessoa selecionada no dispositivo. No notebook, basta alternar com 1/2/3.
2. **Fechar mês** fica disponível a partir do dia 1, quando todos os votos necessários existirem. Ao confirmar:
   - pendências do último dia são resolvidas como estiverem (aviso explícito antes);
   - grava `month_results` e `month_scores` em uma transação;
   - abre a **cerimônia**.
3. **Cerimônia**: revelação em suspense do 3º ao 1º lugar, pódio com fotos, medalhas do mês.
   - 1º lugar: sorvete grande 🍨. 2º lugar: sorvete pequeno 🍦.
   - 3º lugar: tela **"Escolha o seu castigo"** com a roleta de três opções e fotos:
     - rezar o terço com a tia Arlete
     - colocar todos os casacos que a nonna mandar
     - fazer 2 portas de armário com o Vanderlei
   - O resultado da roleta é gravado em `month_results.punishment`.
4. **Hall da fama**: meses fechados, com pódio, medalhas e castigo sorteado. A cerimônia pode ser revista.

---

## 8. Telas e interação

### 8.1 Painel (`/`)

- **Placar** no topo: três avatares com anel de progresso (% do total), coroa no líder, sequência 🔥 e contador "em julgamento".
- **Seletor de pessoa**: três avatares grandes. A escolha fica em cookie de longa duração (`selected_person`), por dispositivo, até ser trocada. Define ao mesmo tempo **o que se vê e em nome de quem se age**.
- **Tarefas de hoje** da pessoa selecionada, agrupadas por período, com figura grande. Um toque ou Enter marca como feita; segundo toque desfaz (dentro do prazo).
  - Menu "⋯" por tarefa: "Não cumprida", "Desfazer".
  - Aba "Ontem" visível enquanto o prazo retroativo estiver aberto.
- **Agenda** de hoje e amanhã (Pedro e Rodrigo).
- **Aniversários do mês** em faixa lateral ou inferior.
- **Ações** (botões grandes, sempre visíveis):
  - **"Fiz um extra:"** texto livre (até 280 caracteres).
  - **"Dedurando:"** escolher o acusado, texto livre. Opcionalmente tocar em uma tarefa concluída do acusado (hoje ou ontem) para contestar: "Não fez direito" (vai a julgamento) ou "Não fez" (marca `missed` direto).
  - **"Fiz para o/a…"**: escolher a pessoa e a tarefa pendente dela.
  - **"Nova tarefa"**: responsável, título, figura, período, peso, recorrência (uma vez, diária, dias da semana, dia do mês).
  - **"Aniversário"**: nome, dia, mês, ano opcional.

### 8.2 Uso no notebook (teclado e mouse)

Pedro usa principalmente o notebook, então **toda ação precisa ser possível sem toque**:

| Tecla | Ação |
|---|---|
| `1` / `2` / `3` | Selecionar Pedro / Vania / Rodrigo |
| `↑` `↓` | Navegar pelas tarefas |
| `Espaço` ou `Enter` | Marcar / desmarcar |
| `E` | Fiz um extra |
| `D` | Dedurando |
| `F` | Fiz para… |
| `N` | Nova tarefa |
| `Esc` | Fechar diálogo |

- Foco visível e alvos de clique grandes (mínimo 44 px).
- Atalhos desativados enquanto um campo de texto estiver com foco.

### 8.3 Modo painel (kiosk)

Ativado por dispositivo em Configurações (guardado em `localStorage`). Quando ativo:

- Após `idle_rotation_seconds` sem interação, alterna sozinho entre as três pessoas e o placar. Qualquer tecla ou movimento do mouse interrompe e volta à pessoa selecionada.
- **Pixel-shift**: desloca o layout 2 a 4 px a cada poucos minutos.
- **Tema escuro automático** das 21h às 6h.
- **QR code** discreto no canto, para abrir no celular.
- **Som e confete** quando chega um evento em tempo real, respeitando `quiet_hours`.

### 8.4 Tempo real

- Toda Server Action de escrita emite um broadcast `changed` com `{ type, personId }` e nada mais.
- O cliente escuta o canal e refaz a leitura pelo servidor. Se `type = task_done`, mostra aviso ("Pedro arrumou a cama!"), confete e som.
- **Reserva**: releitura automática a cada 60 s, para o caso de o canal cair.
- Som no kiosk depende da flag `--autoplay-policy=no-user-gesture-required` do Chromium (anotar para a sessão do notebook). No celular, o som só toca depois da primeira interação.

### 8.5 Offline

O último estado recebido fica em `localStorage`. Sem rede: mostrar o estado guardado com selo "offline" e desativar as ações de escrita. Sem service worker.

### 8.6 Configurações (`/config`)

Acesso por um ícone discreto. Sem bloqueio técnico; combinado da casa: adultos.

- Tarefas: criar, editar, encerrar, reordenar, peso, figura.
- Aniversários.
- Agenda: links iCal de Pedro e Rodrigo, palavras-chave de prova.
- **Folgas**: pessoa, período, tarefa específica ou todas, motivo.
- **Edições pontuais**: alterar o estado de qualquer ocorrência de um mês aberto, com motivo obrigatório (vai para o log).
- Parâmetros de pontuação, som e horário de silêncio.
- Modo painel deste dispositivo.
- **Exportar dados (JSON)**: cópia de segurança manual, já que o plano gratuito do Supabase não tem backup.
- Log de alterações (últimas 200 entradas).

---

## 9. Direção visual

Limpo, mas vibrante. A CLI deve usar a skill de design de frontend, se disponível, ao implementar as telas.

- **Uma cor forte por pessoa**, usada em avatar, anel, botões e confete: Pedro azul elétrico, Vania magenta-coral, Rodrigo verde-água. Fundo neutro claro, bastante espaço em branco.
- **Tipografia**: fonte display arredondada para títulos e números do placar, sans legível para texto, ambas via `next/font`.
- **Cartões grandes** com cantos bem arredondados, figura à esquerda, estado claro (pendente, feita, não cumprida, coberta).
- **Ilustrações próprias** em `/public/tasks` para "Guardar Everest" (montanha de roupa com bandeirinha no topo) e "Passear com o Pingo". SVG simples, no mesmo traço.
- **Movimento com parcimônia**: confete e som só em conquistas; respeitar `prefers-reduced-motion`.
- Legível a 3 metros no notebook e utilizável com uma mão no celular.
- Textos da interface em português do Brasil.

---

## 10. Server Actions

Uma função por caso de uso em `app/actions`. Todas: validam a entrada, verificam mês aberto e prazo, gravam, registram em `audit_log`, emitem broadcast e revalidam o cache.

| Action | Entrada | Regras |
|---|---|---|
| `markDone` | `taskId, dueDate` | Dentro do prazo; ator = dono |
| `undoMark` | `taskId, dueDate` | Dentro do prazo |
| `markMissed` | `taskId, dueDate, note?` | Qualquer pessoa; direto |
| `coverTask` | `taskId, dueDate` | Ator ≠ dono; ocorrência pendente |
| `createExtra` | `description, happenedOn` | 1 a 280 caracteres |
| `createReport` | `accusedId, description, taskId?, dueDate?` | Autor ≠ acusado |
| `setDefense` | `reportId, defense` | Ator = acusado |
| `castVote` | `targetKind, targetId, value` | Extra: ator ≠ autor, 0 a 3. Dedurada: 0 ou 1 |
| `closeMonth` | `month` | Mês encerrado, votos completos, transação única |
| `spinPunishment` | `month` | Só uma vez; sorteio no servidor |
| `upsertTask`, `endTask` | — | Versionamento da seção 6 |
| `upsertBirthday`, `deleteBirthday` | — | |
| `upsertDayOff`, `deleteDayOff` | — | |
| `overrideOccurrence` | `taskId, dueDate, status, reason` | Mês aberto; motivo obrigatório |
| `updateSettings`, `updateCalendar` | — | |

Erros: retornar `{ ok: false, code, message }` com mensagem amigável; nunca expor detalhes do banco. Registrar o erro completo no servidor.

---

## 11. Segurança e privacidade

Decisão: **sem autenticação**. Consequência assumida: quem tiver a URL lê e escreve tudo. Mitigações que não acrescentam nenhum atrito de uso:

1. `robots: noindex, nofollow` nos metadados, cabeçalho `X-Robots-Tag` e `robots.txt` com `Disallow: /`.
2. Nome do projeto na Vercel não óbvio (a URL é a única barreira).
3. RLS ligado sem policies; `SUPABASE_SECRET_KEY` só no servidor. A chave pública do navegador não lê tabela alguma.
4. Links iCal só no servidor. Quem tem o link lê a agenda inteira; por isso ele nunca vai ao cliente. O cliente recebe apenas título e horário dos próximos dias.
5. Sem analytics, sem serviços de terceiros além de Vercel, Supabase e Google (iCal).
6. `audit_log` de toda escrita, com a pessoa selecionada no dispositivo.
7. Validação de tamanho e tipo em toda entrada; texto livre sempre renderizado como texto (sem HTML).
8. Exportação manual em JSON como cópia de segurança.

Se um dia a URL vazar, a saída mais barata é uma senha única da casa em cookie de longa duração; o desenho atual permite acrescentar isso sem refatorar.

---

## 12. Testes

- **Unitários (Vitest)** nas funções puras, obrigatórios:
  - recorrência: cada `kind`, limites de `valid_from`/`valid_to`, dia 31 em mês curto, véspera de prova no domingo;
  - datas: virada de dia e de mês em `America/Sao_Paulo`, prazo de 23h de D+1;
  - placar: pesos, `covered` neutro, folga, extras com média de dois votos, dedurada 2 de 3, contestação, desempate;
  - sequências: folga não quebra, falha quebra.
- **Verificação manual por tarefa**: cada item da seção 14 tem critério de aceite verificável no navegador.
- Sem testes end-to-end automatizados nesta versão.

---

## 13. Riscos e pontos a validar antes de codar

| Risco | Como validar | Plano B |
|---|---|---|
| A conta Google do Pedro (se for supervisionada pelo Family Link ou escolar) pode não oferecer o "Endereço secreto no formato iCal" | Abrir Google Agenda na web → Configurações da agenda → "Integrar agenda" | Criar a agenda "Pedro" na conta de um adulto e compartilhar com ele; usar o link secreto dessa agenda |
| Atraso na atualização do iCal | Criar um evento e medir | Aceitável: a véspera é calculada com dias de antecedência |
| Calibragem da pontuação (bônus de "Fiz para" pode pesar demais) | Tratar o primeiro mês como teste | Ajustar `favor_bonus` ou criar teto mensal |
| Supabase alterou o esquema de chaves (publishable/secret no lugar de anon/service_role) | Conferir no painel do projeto ao criar | Usar as chaves legadas, se forem as oferecidas |
| Autoplay de som bloqueado | Testar no Chromium do notebook | Flag de kiosk; no celular, som após primeira interação |

---

## 14. Quebra em tarefas para a CLI

Cada tarefa é uma sessão independente. Instrução padrão para todas: *"Leia `plano-controle-tarefas-familiar.md`, seções indicadas. Implemente apenas o escopo desta tarefa. Não adicione dependências fora da seção 3. Rode os testes e o build antes de concluir."*

| # | Tarefa | Seções | Critério de aceite |
|---|---|---|---|
| T00 | **Pré-requisitos manuais** (você): criar projeto Supabase em `sa-east-1`, projeto Vercel, repositório Git; obter os links iCal; validar o risco do iCal do Pedro | 3, 13 | Chaves e links em mãos |
| T01 | **Scaffold**: Next.js + TypeScript strict + Tailwind, estrutura de pastas, `next/font`, tokens de cor, metadados `noindex`, `robots.txt`, Vitest configurado, fotos copiadas para `/public` | 3, 4, 9, 11 | `build` e `test` passam; página inicial vazia com o tema |
| T02 | **Banco**: migração da seção 6, triggers de mês fechado, `seed.sql` com pessoas, tarefas e parâmetros | 5, 6 | Migração aplica do zero; seed confere com a seção 5 |
| T03 | **Domínio: datas e recorrência** (puro, com testes) | 7.1, 7.2, 12 | Testes da seção 12 passam |
| T04 | **Domínio: placar, sequências, medalhas** (puro, com testes) | 7.3, 7.4, 12 | Testes passam |
| T05 | **Camada de dados e Server Actions de tarefas**: repositórios, `markDone`, `undoMark`, `markMissed`, `coverTask`, `audit_log`, validação | 4, 6, 7.2, 10 | Actions respeitam prazo e mês fechado |
| T06 | **Painel**: placar, seletor com cookie, lista de hoje e de ontem, marcação por toque | 8.1, 9 | Seleção persiste por dispositivo; marcar atualiza o placar |
| T07 | **Ações do painel**: Fiz um extra, Dedurando (com contestação), Fiz para, Nova tarefa | 8.1, 10 | Os quatro fluxos gravam e aparecem como "em julgamento" quando aplicável |
| T08 | **Agenda iCal e véspera de prova** | 7.5 | Eventos de hoje e amanhã aparecem; evento "Prova" gera estudo na véspera |
| T09 | **Aniversários** | 7.6, 8.1 | Cadastro e faixa do mês com contagem regressiva |
| T10 | **Tempo real, som e confete** + releitura de reserva | 8.4 | Marcar no celular anima o notebook em menos de 2 s |
| T11 | **Julgamento**: defesa, votos, regras de quem vota | 7.7, 10 | Só fecha com votos completos |
| T12 | **Fechamento, cerimônia, roleta e Hall da fama** | 7.7 | Mês fechado fica imutável; roleta grava o castigo |
| T13 | **Configurações**: tarefas, agenda, folgas, edições pontuais, parâmetros, exportação, log | 8.6 | Edição de peso cria nova versão sem alterar o passado |
| T14 | **Teclado e modo painel**: atalhos, rotação ociosa, pixel-shift, tema noturno, QR, cache offline | 8.2, 8.3, 8.5 | Pedro conclui todos os fluxos só com teclado |
| T15 | **Medalhas, sequências e ilustrações** na interface | 7.4, 9 | 🔥 e medalhas visíveis; Everest e Pingo com figura própria |
| T16 | **Deploy e revisão final**: variáveis na Vercel, região `gru1`, checklist da seção 11, teste em celular e notebook | 3, 11 | App no ar, checklist completo |

Dependências: T01 → T02 → T03 → T04 → T05 → T06 → T07. Depois disso, T08, T09, T10, T13, T14 e T15 são independentes entre si. T11 → T12. T16 por último.

**Depois do app pronto (outra sessão):** formatar o notebook, Ubuntu, login automático, Chromium em kiosk com as flags de câmera e autoplay, `motion` + DPMS, BIOS para religar ao voltar a energia.
