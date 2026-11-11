#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:=localhost}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=yorbuddy_test}"
: "${PGPASSWORD:=postgres}"
export PGHOST PGUSER PGDATABASE PGPASSWORD

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# Session A obtains the booking row lock, confirms payment A, then holds the
# transaction open briefly so session B must wait on the same booking row.
psql -v ON_ERROR_STOP=1 >"$tmpdir/a.log" 2>&1 <<'SQL' &
BEGIN;
SELECT public.confirm_booking_payment(
 '10000000-0000-4000-8000-000000000001','pay_concurrent_a','sig_a'
);
SELECT pg_sleep(2);
COMMIT;
SQL
pid_a=$!

# Start session B while A is holding the booking lock.
sleep 0.3
set +e
psql -v ON_ERROR_STOP=1 >"$tmpdir/b.log" 2>&1 <<'SQL'
BEGIN;
SELECT public.confirm_booking_payment(
 '10000000-0000-4000-8000-000000000002','pay_concurrent_b','sig_b'
);
COMMIT;
SQL
status_b=$?
set -e

wait "$pid_a"

if [[ $status_b -eq 0 ]]; then
  echo "ERROR: both concurrent payment confirmations succeeded"
  cat "$tmpdir/a.log" "$tmpdir/b.log"
  exit 1
fi

if ! grep -q "Another payment has already succeeded for this booking" "$tmpdir/b.log"; then
  echo "ERROR: session B failed for an unexpected reason"
  cat "$tmpdir/a.log" "$tmpdir/b.log"
  exit 1
fi

psql -v ON_ERROR_STOP=1 -Atc "
  SELECT CASE WHEN count(*) = 1 THEN 'PASS'
              ELSE 'FAIL' END
  FROM public.payments
  WHERE booking_id='00000000-0000-4000-8000-000000000001'
    AND payment_type='booking' AND status='success';
" | grep -qx PASS

echo "PASS: two independent PostgreSQL sessions; exactly one payment succeeded."
