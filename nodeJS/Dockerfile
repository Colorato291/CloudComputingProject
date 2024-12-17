# Node 18 ielāde
FROM node:18
WORKDIR /app
# Visu failu pārkopēšana
COPY . .
# NodeJS paplašinājumu instalācija
RUN npm install
# Docker.io instalācija, lai varētu veikt docker komandas
RUN apt-get update && apt-get install -y docker.io
# Porta atvēršana
EXPOSE 3000
# Startēšana
CMD ["npm", "start"]