import { createApp } from "./app.js";
import { env } from "./env.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[mymoney-api] escuchando en el puerto ${env.PORT} (entorno: ${env.NODE_ENV})`);
});
