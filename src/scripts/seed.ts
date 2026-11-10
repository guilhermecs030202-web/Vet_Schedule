import "reflect-metadata";
import { AppDataSource } from "../lib/data-source";
import { Usuario } from "../entities/Usuario";
import { gerarHashSenha } from "../lib/auth";

async function criarTabelasSeNaoExistirem() {
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS \`usuarios\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`email\` VARCHAR(150) NOT NULL UNIQUE,
      \`senhaHash\` VARCHAR(255) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS \`agendamentos\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`clinica\` VARCHAR(150) NOT NULL,
      \`animal\` VARCHAR(100) NOT NULL,
      \`tipoExame\` VARCHAR(100) NOT NULL,
      \`dataColeta\` DATETIME NOT NULL,
      \`status\` ENUM('Agendado', 'Coletado', 'Cancelado') NOT NULL DEFAULT 'Agendado',
      \`observacoes\` TEXT NULL,
      \`criadoEm\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX \`IDX_dataColeta\` (\`dataColeta\`),
      INDEX \`IDX_status\` (\`status\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function runSeed() {
  console.log("🌱 [Seed] Iniciando processo de seed...");

  const email = process.env.SEED_USER_EMAIL || "recepcao@vetschedule.com";
  const senha = process.env.SEED_USER_PASSWORD || "Admin@123";

  if (!email || !senha) {
    throw new Error(
      "As variáveis SEED_USER_EMAIL e SEED_USER_PASSWORD devem estar definidas no .env"
    );
  }

  // Inicializa a conexão com o banco de dados
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Garante que as tabelas existam sem colisão de sincronização
  await criarTabelasSeNaoExistirem();

  const usuarioRepository = AppDataSource.getRepository(Usuario);

  // Verifica se o usuário já existe para não duplicar
  const usuarioExistente = await usuarioRepository.findOne({
    where: { email: email.toLowerCase().trim() },
  });

  if (usuarioExistente) {
    console.log(`ℹ️ [Seed] Usuário já cadastrado no banco: ${email} (nenhum registro duplicado)`);
  } else {
    const senhaHash = await gerarHashSenha(senha);
    const novoUsuario = usuarioRepository.create({
      email: email.toLowerCase().trim(),
      senhaHash,
    });

    await usuarioRepository.save(novoUsuario);
    console.log(`✅ [Seed] Usuário criado com sucesso! E-mail: ${email}`);
  }

  await AppDataSource.destroy();
  console.log("🌱 [Seed] Seed finalizado com sucesso!");
}

runSeed().catch((error) => {
  console.error("❌ [Seed] Erro ao executar seed:", error);
  process.exit(1);
});
