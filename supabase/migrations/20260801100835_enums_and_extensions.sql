-- Extensions
create extension if not exists pgcrypto;

-- Enums
create type user_role as enum ('admin', 'vendor', 'project_manager', 'hr', 'employee');
create type sla_status as enum ('on_track', 'warning', 'breached', 'met');
create type booking_status as enum ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
