-- ============================================================================
-- EVENT CORNER - TRIGGERS
-- ============================================================================
-- This file contains all trigger functions and trigger definitions
-- for automatic data management operations
-- ============================================================================


-- ============================================================================
-- 1. AUTO-UPDATE TIMESTAMP TRIGGER FUNCTION
-- ============================================================================
-- Purpose: Automatically updates the updated_at column when a row is modified
-- Used by: events, event_timeslots, event_registrations tables
-- ============================================================================

CREATE OR REPLACE FUNCTION update_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 2. TRIGGER DEFINITIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Events Table - Auto-update timestamp on modification
-- ----------------------------------------------------------------------------
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_timestamp();


-- ----------------------------------------------------------------------------
-- 2.2 Event Timeslots Table - Auto-update timestamp on modification
-- ----------------------------------------------------------------------------
CREATE TRIGGER timeslots_updated_at
    BEFORE UPDATE ON event_timeslots
    FOR EACH ROW
    EXECUTE FUNCTION update_events_timestamp();


-- ----------------------------------------------------------------------------
-- 2.3 Event Registrations Table - Auto-update timestamp on modification
-- ----------------------------------------------------------------------------
CREATE TRIGGER registrations_updated_at
    BEFORE UPDATE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_events_timestamp();


-- ============================================================================
-- DROP TRIGGERS (if needed for cleanup/recreation)
-- ============================================================================
-- To safely recreate triggers, use these DROP statements first:
--
-- DROP TRIGGER IF EXISTS events_updated_at ON events;
-- DROP TRIGGER IF EXISTS timeslots_updated_at ON event_timeslots;
-- DROP TRIGGER IF EXISTS registrations_updated_at ON event_registrations;
-- DROP FUNCTION IF EXISTS update_events_timestamp();
-- ============================================================================
