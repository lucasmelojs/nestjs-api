FROM node:18-alpine

WORKDIR /usr/src/app

# Install NestJS CLI globally
RUN npm i -g @nestjs/cli

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]