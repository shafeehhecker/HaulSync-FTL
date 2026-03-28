FROM node:18-slim

WORKDIR /app

# Install OpenSSL — required by Prisma's query engine binary
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads/pods

RUN npx prisma generate

EXPOSE 5001

CMD ["node", "server.js"]
