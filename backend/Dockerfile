FROM node:18-alpine

WORKDIR /app

# Install OpenSSL, development tools and rate-limit dependencies
RUN apk add --no-cache openssl postgresql-client build-base python3

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/_debug/health || exit 1

CMD ["npm", "run", "dev"]
