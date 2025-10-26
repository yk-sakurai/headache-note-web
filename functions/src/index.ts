import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { stripeWebhook } from "./stripe/webhook";

setGlobalOptions({ maxInstances: 10, region: "asia-northeast1" });

export const ping = onRequest((req, res) => {
  logger.info("ping", { method: req.method, path: req.path });
  res.status(200).send("pong");
});

export { stripeWebhook };
