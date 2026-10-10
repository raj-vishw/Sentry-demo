# Development image — runs the API with hot reload via `tsx watch`.
# docker-compose.yml bind-mounts the source over this, so COPY here mainly
# matters for building the image standalone (`docker build .`).
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
