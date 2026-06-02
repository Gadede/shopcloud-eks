FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q -O- http://localhost:3004/health || exit 1
CMD ["node", "index.js"]