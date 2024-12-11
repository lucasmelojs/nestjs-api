FROM node:18-alpine AS development

# Create app directory
WORKDIR /usr/src/app

# Install NestJS CLI
RUN npm i -g @nestjs/cli

# Copy application dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate prisma client
RUN npm run build

FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Install NestJS CLI
RUN npm i -g @nestjs/cli

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the bundled code from builder stage
COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/main"]