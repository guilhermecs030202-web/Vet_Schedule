import { z } from "zod";

export const STATUS_AGENDAMENTO = ["Agendado", "Coletado", "Cancelado"] as const;
export type StatusAgendamentoTipo = (typeof STATUS_AGENDAMENTO)[number];

export const statusAgendamentoSchema = z.enum(STATUS_AGENDAMENTO, {
  errorMap: () => ({
    message: "Status inválido. Deve ser 'Agendado', 'Coletado' ou 'Cancelado'",
  }),
});

/**
 * Cria o schema de validação para agendamento.
 * dataReferencia pode ser uma Date fixa (para testes determinísticos)
 * ou uma função geradora (para avaliar 'agora' dinamicamente no momento da validação).
 */
export function criarAgendamentoSchema(dataReferencia?: Date | (() => Date)) {
  const obterDataReferencia = (): Date => {
    if (typeof dataReferencia === "function") {
      return dataReferencia();
    }
    if (dataReferencia instanceof Date) {
      return dataReferencia;
    }
    return new Date();
  };

  return z.object({
    clinica: z
      .string({ required_error: "Clínica é obrigatória" })
      .trim()
      .min(1, "Clínica não pode ser vazia"),

    animal: z
      .string({ required_error: "Animal é obrigatório" })
      .trim()
      .min(1, "Animal não pode ser vazio"),

    tipoExame: z
      .string({ required_error: "Tipo de exame é obrigatório" })
      .trim()
      .min(1, "Tipo de exame não pode ser vazio"),

    dataColeta: z
      .preprocess((val) => {
        if (typeof val === "string" || typeof val === "number") {
          return new Date(val);
        }
        return val;
      }, z.date({
        required_error: "Data da coleta é obrigatória",
        invalid_type_error: "Data da coleta inválida",
      }))
      .refine(
        (data) => !isNaN(data.getTime()),
        { message: "Data da coleta inválida" }
      )
      .refine(
        (data) => {
          // Avalia a data de referência dinamicamente no momento da validação
          const ref = obterDataReferencia();
          return data.getTime() >= ref.getTime();
        },
        { message: "Data da coleta não pode estar no passado" }
      ),

    status: statusAgendamentoSchema.default("Agendado"),

    observacoes: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
  });
}

/**
 * Schema padrão da aplicação: avalia dinamicamente new Date() no momento de cada validação,
 * impedindo que a data congele quando o servidor inicia.
 */
export const agendamentoSchema = criarAgendamentoSchema(() => new Date());
export type AgendamentoInput = z.infer<ReturnType<typeof criarAgendamentoSchema>>;

/**
 * Interface para verificação de conflitos de horário.
 */
export interface AgendamentoParaConflito {
  id: number;
  dataColeta: Date | string;
  status: string;
}

export interface ResultadoConflitoHorario {
  temConflito: boolean;
  conflitoCom?: AgendamentoParaConflito;
  mensagem?: string;
}

/**
 * Normaliza um timestamp para a precisão de minuto (descartando segundos e milissegundos).
 */
function normalizarParaMinuto(d: Date): number {
  return Math.floor(d.getTime() / 60000) * 60000;
}

/**
 * Verifica se há conflito de horário conforme a regra do teste técnico da Lands:
 * "dois agendamentos com status Agendado no mesmo horário bloqueados."
 *
 * Regras:
 * 1. Não pode existir outro agendamento com status "Agendado" no mesmo horário (mesmo ano, mês, dia, hora e minuto).
 * 2. Na edição (quando agendamentoAtualId é fornecido), o próprio registro é ignorado.
 * 3. Registros com status "Cancelado" ou "Coletado" não geram conflito.
 */
export function verificarConflitoHorario(
  novaData: Date | string,
  agendamentosExistentes: AgendamentoParaConflito[],
  agendamentoAtualId?: number
): ResultadoConflitoHorario {
  const novaDataObj = typeof novaData === "string" ? new Date(novaData) : novaData;
  const novoMinutoTimestamp = normalizarParaMinuto(novaDataObj);

  for (const agendamento of agendamentosExistentes) {
    // Na edição, ignorar o próprio registro
    if (agendamentoAtualId !== undefined && agendamento.id === agendamentoAtualId) {
      continue;
    }

    // Apenas registros com status "Agendado" bloqueiam o horário
    if (agendamento.status !== "Agendado") {
      continue;
    }

    const dataExistente =
      typeof agendamento.dataColeta === "string"
        ? new Date(agendamento.dataColeta)
        : agendamento.dataColeta;

    const existenteMinutoTimestamp = normalizarParaMinuto(dataExistente);

    // Conflito se for exatamente no mesmo horário (mesmo minuto)
    if (novoMinutoTimestamp === existenteMinutoTimestamp) {
      return {
        temConflito: true,
        conflitoCom: agendamento,
        mensagem: `Conflito de horário: já existe uma coleta agendada para o mesmo horário (${dataExistente.toISOString()}).`,
      };
    }
  }

  return { temConflito: false };
}
