"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { exportData } from "@/app/actions/export";
import { ActionButton } from "@/components/ui/action-button";

/** "Exportar dados" (seção 8.6/11): cópia de segurança manual em JSON. */
export function ExportSection() {
  const [isPending, setIsPending] = useState(false);

  const handleExport = () => {
    setIsPending(true);
    void (async () => {
      try {
        const data = await exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `tarefeitor-backup-${data.exportedAt.slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast("Backup baixado.");
      } catch (error) {
        console.error("Falha ao exportar dados:", error);
        toast("Não foi possível exportar os dados. Tente novamente.");
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="t-title">Exportar dados</h2>
      <p className="t-caption text-muted-foreground">
        Cópia de segurança manual em JSON de todas as tabelas — o plano gratuito do Supabase não tem backup
        automático (seção 8.6/11).
      </p>
      <ActionButton variant="accent" size="md" onClick={handleExport} disabled={isPending} className="w-fit">
        <Download className="size-4" aria-hidden /> {isPending ? "Exportando…" : "Exportar dados (JSON)"}
      </ActionButton>
    </section>
  );
}
