FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache gettext

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
COPY docker/env-config.template.js /app/env-config.template.js
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.sh

ENV VITE_BASE44_APP_ID=
ENV VITE_BASE44_APP_BASE_URL=
ENV VITE_BASE44_FUNCTIONS_VERSION=

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
