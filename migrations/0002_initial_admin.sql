-- ==============================================================================
-- Migration: 0002_initial_admin.sql
-- Inserção segura de administradores iniciais para primeiro acesso
-- ==============================================================================

-- Administrador (admin@gcs.com.br / senha: admin123)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, active)
VALUES (
  1,
  'Administrador da Frota',
  'admin@gcs.com.br',
  '$2a$10$EoHa7gjvNtnVldnPjrtgr.mjIqt7s.5y7SwIpTJT/sA66fFxHFaRO',
  'admin',
  1
);

-- Operador de Abastecimento (operador@gcs.com.br / senha: 123456)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, active)
VALUES (
  2,
  'Operador de Pista',
  'operador@gcs.com.br',
  '$2a$10$F8rsg9KgC3AdY0cQfU8IUujh59GapdpWlR4HMSKxFjfIvQ6Ke19oO',
  'operator',
  1
);
