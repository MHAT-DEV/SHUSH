# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN rm -f package-lock.json && npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN rm -f package-lock.json && npm install --production

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
