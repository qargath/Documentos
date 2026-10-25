FROM node:22-alpine AS build
WORKDIR /app
ENV npm_config_update_notifier=false
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN node --experimental-strip-types scripts/check.ts && npm run build

FROM nginxinc/nginx-unprivileged:alpine
USER root
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's/\r$//' /etc/nginx/conf.d/default.conf \
 && chown nginx:nginx /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
