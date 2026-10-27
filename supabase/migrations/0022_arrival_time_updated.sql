-- SCRUM-107: tell the contacts when the walker adds time.
--
-- Extending a walk (extend_walk, 0006) moves the deadline. Before this file the contacts still
-- expected the old time, and could start to worry when it passed. Now each extension sends them
-- "Anna updated the arrival time" with the new time, through the same Edge Function as the other
-- walk messages (0009, 0011).
--
-- Only an extension sends it:
-- - not the deadline set when the walk starts: that is an insert, and "is on the way home" already
--   says the time (0009);
-- - once per extension: extend_walk changes the row once per tap, and the trigger fires once per
--   change;
-- - only while the walk is active, and only when the deadline moves later. extend_walk refuses an
--   overdue walk anyway; this keeps a hand edit in the Table Editor from sending it.
--
-- Deploy send-walk-push with the deadline_extended event before running this file, or the function
-- answers "Expected { walk_id, event }" and the message is lost (docs/backend.md, "Sending push").

create function public.send_walk_extended_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The name matches WalkEvent in supabase/functions/send-walk-push/walkPush.ts. queue_walk_push
  -- (0011) never fails, so a problem with push cannot stop the extension itself (see 0010).
  perform public.queue_walk_push(new.id, 'deadline_extended');
  return new;
end;
$$;

-- Same as the other push functions: only the trigger runs it; the app cannot call it.
revoke execute on function public.send_walk_extended_push() from public, anon, authenticated;

create trigger walks_push_when_extended
  after update of deadline on public.walks
  for each row
  when (old.status = 'active' and new.status = 'active' and new.deadline > old.deadline)
  execute function public.send_walk_extended_push();
