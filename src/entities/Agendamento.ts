import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type StatusAgendamento = "Agendado" | "Coletado" | "Cancelado";

export const STATUS_AGENDAMENTO_VALORES: readonly StatusAgendamento[] = [
  "Agendado",
  "Coletado",
  "Cancelado",
];

@Entity("agendamentos")
export class Agendamento {
  @PrimaryGeneratedColumn({ type: "int" })
  id!: number;

  @Column({ type: "varchar", length: 150, nullable: false })
  clinica!: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  animal!: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  tipoExame!: string;

  @Index()
  @Column({ type: "datetime", nullable: false })
  dataColeta!: Date;

  @Index()
  @Column({
    type: "enum",
    enum: STATUS_AGENDAMENTO_VALORES,
    default: "Agendado",
    nullable: false,
  })
  status!: StatusAgendamento;

  @Column({ type: "text", nullable: true })
  observacoes?: string | null;

  @CreateDateColumn({ type: "datetime" })
  criadoEm!: Date;
}

