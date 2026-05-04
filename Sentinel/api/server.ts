import type { IncomingMessage, ServerResponse } from "node:http";

export const config = { api: { bodyParser: false } };

let _app: { fetch: (req: Request) => Promise<Response> } | undefined;

async function getApp() {
  if (!_app) {
    const mod = await import("../dist/server/server.js");
    _app = mod.default;
  }
  return _app!;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();

  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const host = req.headers.host ?? "localhost";
  const url = `${proto}://${host}${req.url ?? "/"}`;

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val != null) {
      headers.set(key, Array.isArray(val) ? val.join(", ") : val);
    }
  }

  const bodyChunks: Buffer[] = [];
  if (!["GET", "HEAD"].includes(req.method ?? "GET")) {
    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer) => bodyChunks.push(chunk));
      req.on("end", resolve);
      req.on("error", reject);
    });
  }

  const webReq = new Request(url, {
    method: req.method ?? "GET",
    headers,
    body: bodyChunks.length > 0 ? Buffer.concat(bodyChunks) : undefined,
  });

  const webRes = await app.fetch(webReq);

  res.statusCode = webRes.status;
  webRes.headers.forEach((val, key) => res.setHeader(key, val));

  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}
