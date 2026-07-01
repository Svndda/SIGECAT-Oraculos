#!/usr/bin/env bash
#
# Login rate-limiter concurrency test.
#
# Fires N simultaneous POST /auth/login requests (wrong password) for one demo
# user from the same client IP, then checks that the shared rate-limit counter
# counted every request exactly once (no lost updates under the SELECT ... FOR
# UPDATE row lock) and that requests past the limit were rejected with HTTP 429.
#
# Env:
#   API_URL   base URL of the API           (default http://localhost:8000)
#   EMAIL     target demo user              (default demo.marco@ucr.ac.cr)
#   N         number of concurrent requests (default 30)
#   HELPER    how to run rate_limit_helper.php against the DB
#             (default: docker compose exec -T api php /app/api/tests/concurrency/rate_limit_helper.php)
#
# The login rate limit is 10 requests / 300 s per IP (AuthController).
set -uo pipefail

API_URL="${API_URL:-http://localhost:8000}"
EMAIL="${EMAIL:-demo.marco@ucr.ac.cr}"
N="${N:-30}"
LIMIT=10
HELPER="${HELPER:-docker compose exec -T api php /app/api/tests/concurrency/rate_limit_helper.php}"

echo "== Login rate-limiter concurrency test =="
echo "API_URL=$API_URL  EMAIL=$EMAIL  concurrent_requests=$N  limit=${LIMIT}/300s"
echo

# 1) Reset the limiter bucket and the user's failed-attempt counter.
$HELPER reset "$EMAIL" >/dev/null

# 2) Fire N requests in parallel; print only the HTTP status of each.
codes="$(seq 1 "$N" | xargs -P "$N" -I{} \
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"definitely-wrong\"}")"

# 3) Tally the responses.
c200=$(grep -c '^200$' <<<"$codes")
c401=$(grep -c '^401$' <<<"$codes")
c403=$(grep -c '^403$' <<<"$codes")
c429=$(grep -c '^429$' <<<"$codes")
c500=$(grep -c '^500$' <<<"$codes")
total=$(grep -c '.' <<<"$codes")
allowed=$(( c200 + c401 + c403 ))

echo "HTTP status tally (of $total responses):"
echo "  200 (ok)            : $c200"
echo "  401 (bad creds)     : $c401"
echo "  403 (locked)        : $c403"
echo "  429 (rate limited)  : $c429"
echo "  500 (server error)  : $c500"
echo

# 4) Read the counters written under contention.
echo "Counters after the burst:"
$HELPER report "$EMAIL"
echo

# 5) Assertions.
fail=0
max_hits=$($HELPER report "$EMAIL" | sed -n 's/^rate_limits_max_hits=//p')
[ "$c500" -eq 0 ]        || { echo "FAIL: $c500 server errors under load"; fail=1; }
[ "$max_hits" -eq "$N" ] || { echo "FAIL: counter=$max_hits, expected $N (lost updates!)"; fail=1; }
[ "$allowed" -le "$LIMIT" ] || { echo "FAIL: $allowed requests passed the limit of $LIMIT"; fail=1; }
[ "$c429" -ge 1 ]        || { echo "FAIL: no request was rate limited"; fail=1; }

if [ "$fail" -eq 0 ]; then
  echo "PASS: counter is exact ($max_hits/$N), $allowed<=$LIMIT passed, $c429 rejected with 429, 0 errors."
fi
exit "$fail"
