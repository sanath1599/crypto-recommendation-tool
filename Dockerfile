# Start from a lightweight Node.js image
FROM node:18-bullseye-slim

# Set the working directory
WORKDIR /app

# Install system dependencies for scraping, xml parsing, etc.
# Note: xml2js is pure JS, cheerio is JS, but let's ensure curl and others are there.
RUN apt-get update && apt-get install -y curl git ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install Node.js dependencies
# This should install all packages: axios, dotenv, chalk, fs, inquirer, cli-table3, asciichart, cheerio, blessed, xml2js, etc.
RUN npm install

# Copy the entire application code
COPY . .

# Expose any port if your tool runs a server (if not, skip)
# EXPOSE 3000

# Run the Node.js tool by default
# Replace `node cryptoTool.js` with your actual start command
CMD ["node", "cryptoTool.js"]
