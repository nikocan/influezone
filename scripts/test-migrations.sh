#!/usr/bin/env bash
# Applies all Supabase migrations to a throwaway local Postgres cluster and runs the RLS test-suite.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
RUNAS=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$TMP" 2>/dev/null || true
  RUNAS=(runuser -u postgres --)
fi
"${RUNAS[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_auth_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ applying $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -c "grant select, insert, update, delete on all tables in schema public to authenticated, anon; grant execute on all functions in schema public to authenticated, anon;"
set +e
STATUS=0
OUT=""
for t in "$ROOT"/supabase/tests/[1-9]*.sql; do
  R="$("${PSQL[@]}" -f "$t" 2>&1)" || STATUS=1
  OUT="$OUT
$R"
  [ $STATUS -ne 0 ] && break
done
set -e
echo "$OUT" | grep -E "ok -|FAILED|ERROR|PASSED" | sed 's/^psql:[^ ]* //'
exit $STATUS
