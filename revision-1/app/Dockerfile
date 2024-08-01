FROM node:slim
WORKDIR /app
COPY *.ts .
COPY *.json .
RUN npm i --quiet

EXPOSE 8080

CMD ["npm", "run-script", "start"]