SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('FixedSchedule', 'FixedScheduleException', 'playing_with_neon');
