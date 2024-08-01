import { stopInstrumentation } from './instrumentation';

import type { Request, Response } from 'express';
import express, { json, urlencoded } from 'express';

export const app = express();

const PORT = process.env.PORT || 8080;

// Use body parser to read sent json payloads
app.use(
  urlencoded({
    extended: true,
  }),
);

app.use(json());

app.get('/', (_req: Request, res: Response) => {
  res.redirect('/healthcheck');
});

app.get('/healthcheck', (_req: Request, res: Response) => {
  res.send(`healthcheck: ${new Date().toISOString()}`);
});

app.get('/todos', async (_req: Request, res: Response) => {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos');

  res.send(await response.json());
});

app.get('/todos/:id', async (_req: Request, res: Response) => {
  const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${_req.params.id}`);

  res.send(await response.json());
});

const server = app.listen(PORT, () => console.log(`Starting ExpressJSx server on "0.0.0.0/app"`));

async function gracefulShutdown() {
  await stopInstrumentation();
  server.close(err => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default server;
