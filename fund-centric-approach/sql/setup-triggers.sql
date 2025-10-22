-- PostgreSQL Event-Driven Sync Setup
-- This script sets up triggers to notify Neo4j of user changes

-- Enable pg_notify extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_notify;

-- Create notification function for user changes
CREATE OR REPLACE FUNCTION notify_user_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    -- Create payload with change details
    payload = json_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'old', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        'timestamp', extract(epoch from now())
    );
    
    -- Send notification
    PERFORM pg_notify('user_changes', payload::text);
    
    -- Return appropriate row
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS user_changes_trigger ON users;

-- Create trigger for user changes
CREATE TRIGGER user_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_changes();

-- Test the trigger (optional)
-- UPDATE users SET first_name = 'Test Update' WHERE id = 'some-user-id';

-- Check if trigger is working
SELECT 
    schemaname,
    tablename,
    triggername,
    triggerdef
FROM pg_triggers 
WHERE tablename = 'users' AND triggername = 'user_changes_trigger';

-- View recent notifications (for debugging)
-- SELECT * FROM pg_listening_channels();
