# Build
FROM node:20 as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Servidor Web (Nginx)
FROM nginx:alpine
# Copia os ficheiros estáticos gerados na etapa anterior para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expõe a porta 80 (padrão web)
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]