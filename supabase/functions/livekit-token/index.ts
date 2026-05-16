import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.15.2";

function getJwtSub(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const identity = getJwtSub(req);
    if (!identity) return new Response("unauthorized", { status: 401, headers: cors });
    const { room, name } = await req.json();
    if (!room || typeof room !== "string" || room.length > 160) return new Response("missing room", { status: 400, headers: cors });
    const apiKey = Deno.env.get("LIVEKIT_API_KEY")!;
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET")!;
    const url = Deno.env.get("LIVEKIT_URL")!;
    if (!apiKey || !apiSecret || !url) return new Response("LiveKit is not configured", { status: 500, headers: cors });
    const at = new AccessToken(apiKey, apiSecret, { identity, name: name ?? identity, ttl: "1h" });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    return new Response(JSON.stringify({ token, url }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
