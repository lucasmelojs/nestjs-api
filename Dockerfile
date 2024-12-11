FROM node:18-alpine As development

# Create app directory
WORKDIR /usr/src/app

# Copy application dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

FROM node:18-alpine As production

# Create app directory
WORKDIR /usr/src/app

# Copy application dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy built application
COPY --from=development /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]