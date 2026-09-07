FROM node:24.19.0-alpine3.23

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --chown=node:node . .
RUN mkdir -p /app/public/uploads/blog \
    && chown -R node:node /app/public/uploads/blog

USER node
EXPOSE 3000
CMD ["node", "index.js"]
