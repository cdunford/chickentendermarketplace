FROM node:lts-alpine

WORKDIR /app
ADD src ./src/
ADD *.js ./
ADD *.json ./

RUN npm install
RUN npm run build
RUN rm -rf src
RUN rm -rf node_modules
RUN rm -f *.js
RUN rm -f *.json

RUN apk add --no-cache tzdata

VOLUME [ "/app/dist/config/static" ]
VOLUME [ "/app/dist/dynamicContent" ]

EXPOSE 3000

CMD ["node", "dist/index.js"]
