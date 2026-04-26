# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Build arg — injected at build time by docker-compose
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
