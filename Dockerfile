FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

ENV PORT=8080
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/mediahub.db

EXPOSE 8080
CMD ["npm", "run", "start"]
