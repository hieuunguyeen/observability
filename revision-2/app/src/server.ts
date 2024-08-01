import { stopInstrumentation } from './instrumentation';

const PORT = process.env.PORT || 8080;

import { app } from './app';

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
