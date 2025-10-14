import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

setGlobalOptions({ maxInstances: 10 });

export const ping = onRequest((req, res) => {
  logger.info("ping", { method: req.method, path: req.path });
  res.status(200).send("pong");
});
