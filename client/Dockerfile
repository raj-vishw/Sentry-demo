# Development image — runs the Vite dev server with hot reload.
# docker-compose.yml bind-mounts the source over this, so COPY here mainly
# matters for building the image standalone (`docker build .`).
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
