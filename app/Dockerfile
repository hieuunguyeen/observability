FROM node:slim
WORKDIR /app
COPY *.ts .
COPY *.json .
RUN npm i --quiet

CMD ["npm", "run-script", "start"]