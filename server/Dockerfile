FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files and install ALL dependencies (including dev for tsc)
COPY package*.json ./
RUN npm install

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Install Playwright Chromium browser
RUN npx playwright install chromium

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) process.exit(1)})"

# Start application
CMD ["node", "dist/server.js"]
