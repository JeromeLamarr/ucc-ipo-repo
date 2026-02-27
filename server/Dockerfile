FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY server/package*.json ./

RUN npm ci --production

# Copy application code
COPY server/src ./src
COPY src/lib/sharedHTMLTemplate.ts ./lib/sharedHTMLTemplate.ts

# Create lib directory structure
RUN mkdir -p lib && true

# Install Playwright (for PDF generation)
RUN npx playwright install

# Expose port
EXPOSE 3000

# Set environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
