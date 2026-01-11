FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm ci

# Copy source
COPY . .

# Build the server
RUN npm run build

# Expose the port for HTTP transport
EXPOSE 8000

# Start the server
CMD ["node", "dist/index.js"]
