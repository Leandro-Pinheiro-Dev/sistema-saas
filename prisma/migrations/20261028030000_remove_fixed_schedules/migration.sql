-- Remove o recurso de horarios fixos.
-- Preserva os agendamentos normais e as demais tabelas.
DROP TABLE IF EXISTS "FixedScheduleException";
DROP TABLE IF EXISTS "FixedSchedule";
