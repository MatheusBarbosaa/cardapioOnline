// lib/pusher.ts
import PusherServer from "pusher";
import PusherClient from "pusher-js";

declare global {
  // Evita recriar em dev/hot-reload
  // eslint-disable-next-line no-var
  var _pusherServer: PusherServer | undefined;
  // eslint-disable-next-line no-var
  var _pusherClient: PusherClient | undefined;
}

// --- Backend (API Routes) ---
export const pusherServer =
  global._pusherServer ||
  new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
  });

if (process.env.NODE_ENV !== "production") {
  global._pusherServer = pusherServer;
}

// --- Frontend (React Components) ---
export const pusherClient =
  global._pusherClient ||
  (typeof window !== "undefined"
    ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      })
    : (null as any));

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  global._pusherClient = pusherClient;
}
