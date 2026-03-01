-- Rename old combined enum value and add OTHER as separate category
ALTER TYPE "EventCategory" RENAME VALUE 'WORLD_OTHER' TO 'WORLD';
ALTER TYPE "EventCategory" ADD VALUE 'OTHER';
