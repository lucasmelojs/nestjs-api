#!/bin/bash

# Build the application
npm run build

# Run database migrations
npm run db:migrate

# Start the application
npm run start:prod