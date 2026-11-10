import { StatusAgendamento } from "@/types/agendamento";

interface StatusBadgeProps {
  status: StatusAgendamento;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "Agendado") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Agendado
      </span>
    );
  }

  if (status === "Coletado") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Coletado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300 line-through">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Cancelado
    </span>
  );
}

