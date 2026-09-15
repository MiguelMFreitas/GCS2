-- ==============================================================================
-- Migration: 0003_auth_security.sql
-- Atualização de segurança para garantir a existência do administrador 'gerente'
-- ==============================================================================

-- Garante que o índice único de username exista
ALTER TABLE users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Garante a inserção do administrador 'gerente' com a senha inicial 'Civam123' (hash bcrypt)
INSERT OR IGNORE INTO users (username, name, email, password_hash, role, active)
VALUES (
  'gerente',
  'Gerente',
  'gerente@gcs.com.br',
  '$2a$10$/ntocI.NRnpb38MBN/ZpMOyP.5nVoKV4JDkHInWxq1KDZGthUtdqO',
  'admin',
  1
);

-- Sincroniza dados da conta 'gerente' caso já exista
UPDATE users 
SET password_hash = '$2a$10$/ntocI.NRnpb38MBN/ZpMOyP.5nVoKV4JDkHInWxq1KDZGthUtdqO',
    role = 'admin',
    active = 1,
    name = 'Gerente',
    username = 'gerente'
WHERE username = 'gerente' OR email = 'gerente@gcs.com.br';
