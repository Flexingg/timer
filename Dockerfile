FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Debug: List files to verify server.js exists
RUN ls -la

# Ensure proper permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000

# Use absolute path for server.js
CMD ["node", "/app/server.js"] 