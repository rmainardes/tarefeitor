import { cookies } from "next/headers";

import { ConfigView } from "@/components/config/config-view";
import { listRecentAuditLog } from "@/lib/data/auditLog";
import { listAllBirthdays } from "@/lib/data/birthdays";
import { listDaysOff } from "@/lib/data/daysOff";
import { listPeople } from "@/lib/data/people";
import { listAllSettings } from "@/lib/data/settings";
import { listActiveTasks } from "@/lib/data/tasks";
import { toISODate } from "@/lib/domain/dates";
import { SELECTED_PERSON_COOKIE } from "@/lib/session";

const AUDIT_LOG_LIMIT = 200;

/**
 * Configurações (seção 8.6, T13): tarefas, aniversários, agenda, folgas,
 * edições pontuais, parâmetros, exportação e log de alterações. Acesso por
 * um ícone discreto — sem bloqueio técnico, combinado da casa (seção 8.6).
 */
export default async function ConfigPage() {
  const today = toISODate(new Date());

  const [people, tasks, birthdays, daysOff, settings, auditLog, cookieStore] = await Promise.all([
    listPeople(),
    listActiveTasks(today),
    listAllBirthdays(),
    listDaysOff(),
    listAllSettings(),
    listRecentAuditLog(AUDIT_LOG_LIMIT),
    cookies(),
  ]);

  const selectedFromCookie = Number(cookieStore.get(SELECTED_PERSON_COOKIE)?.value);
  const actor = people.find((person) => person.id === selectedFromCookie) ?? people[0];

  return (
    <ConfigView
      actor={actor}
      people={people.map((person) => ({
        id: person.id,
        name: person.name,
        color: person.color,
        hasIcalUrl: person.icalUrl !== null,
        examKeywords: person.examKeywords,
      }))}
      tasks={tasks}
      birthdays={birthdays}
      daysOff={daysOff}
      settings={settings}
      auditLog={auditLog}
    />
  );
}
