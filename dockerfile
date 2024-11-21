# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json for installing dependencies
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the project files
COPY . .

# Expose the port your application runs on (if applicable)
EXPOSE 3000

# Command to run the application
CMD ["node", "src/app.js"]
