FROM node:20-alpine

WORKDIR /app

# Najpierw package.json dla lepszego cachowania
COPY package.json package-lock.json* ./
RUN npm ci

# Potem reszta
COPY . .

# Build for production with increased memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Standalone mode preparation
# Next.js puts the standalone server in .next/standalone
# We need to copy static and public to make them accessible to the server
RUN cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Run from standalone directory
WORKDIR /app/.next/standalone
CMD ["node", "server.js"]