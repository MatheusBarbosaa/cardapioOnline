import PusherServer from "pusher";
import PusherClient from "pusher-js";

// Backend (API Routes) - Com tratamento de erro
let pusherServer: PusherServer | null = null;

try {
  if (typeof window === 'undefined') { // Só no servidor
    pusherServer = new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!, // ← CORRIGIDO
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!, // ← CORRIGIDO
      useTLS: true,
    });
  }
} catch (error) {
  console.error("Erro ao inicializar Pusher Server:", error);
}

// Frontend (componentes React)
let pusherClient: PusherClient | null = null;

if (typeof window !== 'undefined') { // Só no cliente
  try {
    pusherClient = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!, // ← CORRIGIDO
      }
    );
  } catch (error) {
    console.error("Erro ao inicializar Pusher Client:", error);
  }
}

export { pusherServer, pusherClient };
