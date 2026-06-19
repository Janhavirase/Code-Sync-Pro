# Stage 1: Build Environment
FROM node:20-alpine AS builder
WORKDIR /app
# Copy package files first to leverage Docker layer caching
COPY package*.json ./
# npm ci is stricter than npm install, perfect for CI/CD
RUN npm ci
# Copy the rest of the backend code
COPY . .

# Stage 2: Production Environment
FROM node:20-alpine
WORKDIR /app

# Set Node to production mode for performance boosts
ENV NODE_ENV=production

# Copy only the necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app . 

# Expose the port your server runs on
EXPOSE 5000

# 🚨 SECURITY FLEX: Run as a restricted user, not root
USER node

# Start the server
CMD ["node", "index.js"]