-- Database triggers for real-time reminder processing
-- Execute this in Supabase SQL Editor

-- Function to notify when a reminder is due
CREATE OR REPLACE FUNCTION notify_reminder_due()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if the reminder is not already sent
  IF NEW.sent = FALSE AND NEW.scheduled_for <= NOW() THEN
    -- Send notification to the application
    PERFORM pg_notify('reminder_due', json_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'user_name', NEW.user_name,
      'message', NEW.message,
      'scheduled_for', NEW.scheduled_for
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new reminders
CREATE OR REPLACE TRIGGER trigger_reminder_due
  AFTER INSERT ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION notify_reminder_due();

-- Function to check for pending reminders periodically
CREATE OR REPLACE FUNCTION check_pending_reminders()
RETURNS void AS $$
DECLARE
  reminder_record RECORD;
BEGIN
  -- Find all pending reminders that are due
  FOR reminder_record IN
    SELECT id, user_id, user_name, message, scheduled_for
    FROM reminders
    WHERE sent = FALSE AND scheduled_for <= NOW()
  LOOP
    -- Notify the application
    PERFORM pg_notify('reminder_due', json_build_object(
      'id', reminder_record.id,
      'user_id', reminder_record.user_id,
      'user_name', reminder_record.user_name,
      'message', reminder_record.message,
      'scheduled_for', reminder_record.scheduled_for
    )::text);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to check for pending reminders every minute
-- This requires pg_cron extension (available in Supabase Pro)
-- Uncomment if you have pg_cron available:
-- SELECT cron.schedule('check-reminders', '* * * * *', 'SELECT check_pending_reminders();');

-- Alternative: Use a simple function that can be called externally
CREATE OR REPLACE FUNCTION get_due_reminders()
RETURNS TABLE(
  id BIGINT,
  user_id TEXT,
  user_name TEXT,
  message TEXT,
  scheduled_for TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.user_id, r.user_name, r.message, r.scheduled_for
  FROM reminders r
  WHERE r.sent = FALSE AND r.scheduled_for <= NOW()
  ORDER BY r.scheduled_for ASC;
END;
$$ LANGUAGE plpgsql;

