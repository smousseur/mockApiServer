FROM node:23 AS builder
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

FROM node:23-alpine AS production
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
ENV ROUTES="routes"
EXPOSE 3000
CMD ["node", "dist/server.js"]