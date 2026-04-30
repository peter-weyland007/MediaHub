#!/bin/sh
set -eu

envsubst '${VITE_BASE44_APP_ID} ${VITE_BASE44_APP_BASE_URL} ${VITE_BASE44_FUNCTIONS_VERSION}' \
  < /app/env-config.template.js \
  > /usr/share/nginx/html/env-config.js

exec nginx -g 'daemon off;'
