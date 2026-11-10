export type StatusAgendamento = "Agendado" | "Coletado" | "Cancelado";

export interface AgendamentoItem {
  id: number;
  clinica: string;
  animal: string;
  tipoExame: string;
  dataColeta: string;
  status: StatusAgendamento;
  observacoes?: string | null;
  criadoEm: string;
}

export interface AgendamentoFormData {
  clinica: string;
  animal: string;
  tipoExame: string;
  dataColeta: string;
  status: StatusAgendamento;
  observacoes?: string;
}

