#!/usr/bin/env bash
set -euo pipefail
: "${PGHOST:=localhost}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=yorbuddy_test}"
: "${PGPASSWORD:=postgres}"
export PGHOST PGUSER PGDATABASE PGPASSWORD

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
call_rpc() {
  local booking_code="$1" user_id="$2" time="$3"
  psql -v ON_ERROR_STOP=1 -Atc "SELECT (public.create_booking_atomic(
    '$booking_code', '$user_id',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    DATE '2026-12-15', TIME '$time', 2, 500, 1000, 0, 1000,
    now() + interval '30 minutes', 'Test venue', 'Test address', NULL
  )).id;"
}

# Both independent sessions race for the same buddy/time interval.
call_rpc 'RACE-A' 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' '10:00' >"$tmpdir/a.log" 2>&1 &
pid_a=$!
sleep 0.15
set +e
call_rpc 'RACE-B' 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' '10:30' >"$tmpdir/b.log" 2>&1
status_b=$?
set -e
wait "$pid_a"

if [[ $status_b -eq 0 ]]; then
  echo "ERROR: both competing bookings succeeded"
  cat "$tmpdir/a.log" "$tmpdir/b.log"
  exit 1
fi
count="$(psql -Atc "SELECT count(*) FROM public.bookings WHERE booking_date=DATE '2026-12-15' AND buddy_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND status='pending';")"
[[ "$count" == "1" ]] || { echo "ERROR: expected exactly one winner, got $count"; exit 1; }

# Different buddies, same user and overlapping interval must also serialize.
call_rpc 'USER-A' 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' '14:00' >/dev/null
set +e
psql -v ON_ERROR_STOP=1 -Atc "SELECT public.create_booking_atomic(
  'USER-B','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  DATE '2026-12-15', TIME '15:00', 1, 500, 500, 0, 500,
  now()+interval '30 minutes','Test venue','Test address',NULL);" >"$tmpdir/user.log" 2>&1
user_status=$?
set -e
[[ $user_status -ne 0 ]] || { echo "ERROR: overlapping user booking was accepted"; exit 1; }

# Confirmed bookings remain blocking, but cancelled bookings release the slot.
psql -v ON_ERROR_STOP=1 -c "UPDATE public.bookings SET status='confirmed' WHERE booking_code IN ('RACE-A','RACE-B');" >/dev/null
set +e
call_rpc 'CONFIRMED-BLOCK' '22222222-2222-4222-8222-222222222222' '10:30' >"$tmpdir/confirmed.log" 2>&1
confirmed_status=$?
set -e
[[ $confirmed_status -ne 0 ]] || { echo "ERROR: confirmed booking did not block overlap"; exit 1; }
psql -v ON_ERROR_STOP=1 -c "UPDATE public.bookings SET status='cancelled' WHERE booking_code IN ('RACE-A','RACE-B');" >/dev/null
call_rpc 'AFTER-CANCEL' '22222222-2222-4222-8222-222222222222' '10:30' >/dev/null

# Adjacent, non-overlapping slots are allowed.
call_rpc 'NONOVERLAP' '11111111-1111-4111-8111-111111111111' '12:30' >/dev/null

echo "PASS: atomic buddy concurrency, user overlap, non-overlap and cancelled-slot behavior."
