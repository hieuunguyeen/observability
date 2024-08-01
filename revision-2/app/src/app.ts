import './instrumentation';

import type { Request, Response } from 'express';
import express, { json, urlencoded } from 'express';

export const app = express();

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
