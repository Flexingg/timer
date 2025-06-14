FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Debug: List files and show server.js content
RUN ls -la && echo "=== Server.js content ===" && cat server.js

# Ensure proper permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000

# Use relative path since we're in the WORKDIR
CMD ["node", "server.js"] 