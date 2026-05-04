export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  const { default: app } = await import("../dist/server/server.js");
  return app.fetch(req);
}

