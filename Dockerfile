# ---- builder: compile deps (better-sqlite3 is native) + build Next ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: the built app + Chromium for server-side PDF export ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Chromium powers the "Download PDF" route (puppeteer-core drives it). Remove these two
# lines + the CHROME_PATH env to slim the image if you don't need server-side PDF.
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium fonts-liberation ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV CHROME_PATH=/usr/bin/chromium
# The native better-sqlite3 binding was compiled in the builder on the same base image.
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
