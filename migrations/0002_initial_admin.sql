-- ==============================================================================
-- Migration: 0002_initial_admin.sql
-- Inserção segura do usuário administrador inicial 'gerente' e operador
-- ==============================================================================

-- Administrador Inicial: Usuário 'gerente' (senha: 'Civam123' criptografada em bcrypt)
INSERT OR IGNORE INTO users (id, username, name, email, password_hash, role, active)
VALUES (
  1,
  'gerente',
  'Gerente',
  'gerente@gcs.com.br',
  '$2a$10$/ntocI.NRnpb38MBN/ZpMOyP.5nVoKV4JDkHInWxq1KDZGthUtdqO',
  'admin',
  1
);

-- Operador de Pista / Frotista: Usuário 'operador' (senha: '123456')
INSERT OR IGNORE INTO users (id, username, name, email, password_hash, role, active)
VALUES (
  2,
  'operador',
  'Operador de Pista',
  'operador@gcs.com.br',
  '$2a$10$F8rsg9KgC3AdY0cQfU8IUujh59GapdpWlR4HMSKxFjfIvQ6Ke19oO',
  'operator',
  1
);
