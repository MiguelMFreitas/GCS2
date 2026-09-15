-- ==============================================================================
-- Migration: 0004_maintenance_status.sql
-- Adiciona suporte a status e controle de ciclo de vida de manutenções
-- ==============================================================================

ALTER TABLE maintenance_records ADD COLUMN status TEXT DEFAULT 'in_progress';
