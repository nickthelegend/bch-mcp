import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createServer, { configSchema } from "./index.js";
import http from "http";

const config = configSchema.parse({
    debug: process.env.DEBUG === "true",
});

// Map of sessionId -> { transport, server }
const sessions = new Map<string, {
    transport: StreamableHTTPServerTransport;
    server: ReturnType<typeof createServer>;
    lastAccess: number
}>();

const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id, mcp-protocol-version");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if ((pathname === "/mcp" || pathname === "/")) {
        if (req.method === "POST") {
            const sessionId = req.headers["mcp-session-id"] as string | undefined;

            if (sessionId) {
                if (sessions.has(sessionId)) {
                    const session = sessions.get(sessionId)!;
                    session.lastAccess = Date.now();
                    await session.transport.handleRequest(req, res);
                    return;
                } else {
                    // Session requested but not found (likely expired)
                    res.writeHead(410, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        jsonrpc: "2.0",
                        error: { code: -32000, message: "Session expired or not found. Please re-initialize." },
                        id: null
                    }));
                    return;
                }
            }

            // No session -> New connection attempt (likely 'initialize')
            // We create a fresh server/transport pair. The transport will generate 
            // a new session ID and the server will accept the 'initialize' request.
            const newId = crypto.randomUUID();
            console.log(`[HTTP] Starting new isolated session: ${newId}`);

            const server = createServer({ config });
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => newId
            });

            await server.connect(transport);

            const sessionObj = { transport, server, lastAccess: Date.now() };
            sessions.set(newId, sessionObj);

            await transport.handleRequest(req, res);
            return;
        }

        if (req.method === "DELETE") {
            const sessionId = req.headers["mcp-session-id"] as string | undefined;
            if (sessionId && sessions.has(sessionId)) {
                console.log(`[HTTP] Explicitly closing session: ${sessionId}`);
                const { server } = sessions.get(sessionId)!;
                await server.close();
                sessions.delete(sessionId);
            }
            res.writeHead(200);
            res.end(JSON.stringify({ status: "ok" }));
            return;
        }
    }

    // Health / Info Endpoints
    if (req.method === "GET") {
        if (pathname === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                status: "ok",
                activeSessions: sessions.size,
                transport: "http-isolated"
            }));
            return;
        }
        if (pathname === "/") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                name: "BCH MCP Server",
                version: "1.0.0",
                activeSessions: sessions.size,
                endpoint: "/mcp",
                transport: "HTTP (Isolated Sessions)"
            }, null, 2));
            return;
        }
    }

    res.writeHead(404);
    res.end();
});

// Periodic cleanup of idle sessions (30 mins)
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
        if (now - session.lastAccess > 30 * 60 * 1000) {
            console.log(`[Timer] Cleaning up idle session: ${id}`);
            session.server.close().catch(() => { });
            sessions.delete(id);
        }
    }
}, 5 * 60 * 1000);

const port = parseInt(process.env.PORT || "8081");
httpServer.listen(port, "0.0.0.0", () => {
    console.log(`BCH MCP Server listening on port ${port}`);
});
