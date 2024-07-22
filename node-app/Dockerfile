# Node.js application
FROM node:18

# Working directory
WORKDIR /usr/src/app

# Dependencies
COPY package*.json ./
RUN npm install

# Application files
COPY . .

# Port
EXPOSE 3000

# RUN
CMD ["node", "server.js"]
