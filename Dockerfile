FROM node:22-alpine AS build
WORKDIR /app
ENV npm_config_update_notifier=false
COPY package.json ./
RUN npm install
COPY . .
RUN node --experimental-strip-types scripts/check.ts && npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's/\r$//' /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
