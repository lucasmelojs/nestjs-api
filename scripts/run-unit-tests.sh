#!/bin/bash

# Exit on error
set -e

# Run unit tests with coverage
NODE_ENV=test npm run test:cov