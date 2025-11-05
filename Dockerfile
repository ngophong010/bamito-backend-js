# =================================================================
# Stage 1: Build Stage
# =================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# --- THE FIX IS HERE ---
# Use the --legacy-peer-deps flag to resolve the dependency conflict during the build.
RUN npm install --legacy-peer-deps

COPY . .

# (Optional build step for TypeScript)
# RUN npm run build

# =================================================================
# Stage 2: Production Stage
# =================================================================
FROM node:20-alpine

WORKDIR /app

# Copy dependencies and code from the 'builder' stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Expose the port from the .env file (Docker Compose will pass this in)
# Note: You need to pass PORT as a build arg or have it in the environment
# For simplicity with compose, we'll rely on the compose 'ports' mapping.
EXPOSE 8080

# The command to run your application
CMD [ "npm", "run", "dev" ]