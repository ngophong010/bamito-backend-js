# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Your app runs on port 8080, so we need to expose it
EXPOSE 8080

# The command to run your app
CMD [ "npm", "run", "dev" ]