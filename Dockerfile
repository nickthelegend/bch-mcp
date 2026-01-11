FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source
COPY . .

# Build the server with ESM format
RUN npx esbuild src/server.ts --bundle --platform=node --format=esm --outfile=dist/index.js --packages=external

# Expose the port
EXPOSE 8000

# Start the server
CMD ["node", "dist/index.js"]
