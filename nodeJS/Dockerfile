FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN apt-get update && apt-get install -y docker.io
EXPOSE 3000
CMD ["npm", "start"]