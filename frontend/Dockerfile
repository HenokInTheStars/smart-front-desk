FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the frontend source code
COPY . .

# Expose the port Next.js runs on
EXPOSE 3000

# Start the Next.js development server
CMD ["npm", "run", "dev"]