FROM mongo:latest

COPY resetRsPrimary.js /app/

ENTRYPOINT [ "mongo" ]
CMD [ "db/chickentender", "/app/resetRsPrimary.js" ]
