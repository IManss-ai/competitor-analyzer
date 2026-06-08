# Playwright base image ships Chromium + all system deps for the pinned version.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# Python 3 (the base image is Node-based; add Python + pip)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Node sidecar ---
COPY scraper-service/package.json scraper-service/package-lock.json* ./scraper-service/
RUN cd scraper-service && npm ci --omit=dev || npm install --omit=dev
COPY scraper-service ./scraper-service
RUN cd scraper-service && npm install typescript tsx --no-save && npm run build

# --- Python backend ---
# jammy ships pip 22 (no --break-system-packages flag); upgrade pip first so the
# flag is recognized and harmless regardless of PEP-668 externally-managed state.
COPY requirements.txt ./
RUN python3 -m pip install --no-cache-dir --upgrade pip \
    && python3 -m pip install --no-cache-dir --break-system-packages -r requirements.txt
COPY . .

RUN chmod +x scripts/start.sh
ENV SCRAPER_URL=http://localhost:3001
EXPOSE 8000
CMD ["bash", "scripts/start.sh"]
