FROM node:18-slim

WORKDIR /app

# Install OpenSSL — required by Prisma's query engine binary
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (including the pinned `prisma` CLI devDependency).
# `--only=production` strips `prisma`, which forces `npx prisma generate` to
# download a mismatched CLI (v6) from the network at build time. Don't do that.
COPY package*.json ./
RUN npm ci

# Copy the Prisma schema explicitly BEFORE `generate`, so this layer's cache key
# is tied to the schema and `generate` can always find prisma/schema.prisma.
COPY prisma ./prisma
RUN npx prisma generate

# Now copy the rest of the source.
COPY . .

RUN mkdir -p uploads/pods

EXPOSE 5001

CMD ["node", "server.js"]
