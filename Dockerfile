# Use the official Node.js 20 image as the base
FROM node:20

# Set the working directory inside the container
WORKDIR /src

# Copy package files and install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (change if needed)
EXPOSE 5002

# Run the server
CMD ["npm", "run", "start"]
