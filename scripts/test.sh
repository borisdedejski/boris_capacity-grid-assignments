#!/bin/sh
# Runs the test suites in Docker, so no local Go or Node is needed.
#   scripts/test.sh        both suites
#   scripts/test.sh api    Go tests, in the api image against the Compose Postgres
#   scripts/test.sh web    Vitest, in the running web container (needs `make up`)
# Extra arguments go to the test runner, e.g. `scripts/test.sh api -run Health -v`.
set -eu
cd "$(dirname "$0")/.."

api() {
	docker compose run --rm -T -v "$PWD/api:/src" -v "$PWD/db:/db:ro" api go test ./... "$@"
}

web() {
	docker compose exec -T web npm test -- "$@"
}

case "${1:-all}" in
api) shift; api "$@" ;;
web) shift; web "$@" ;;
all) api && web ;;
*) echo "usage: $0 [api|web] [runner args]" >&2; exit 2 ;;
esac
