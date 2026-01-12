import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createServer, { configSchema } from "./index.js";
import http from "http";

const config = configSchema.parse({
    debug: process.env.DEBUG === "true",
});

// Store active sessions
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: ReturnType<typeof createServer> }>();

// MCP Server Card (metadata for discovery)
const mcpCard = {
    name: "bch-mcp",
    description: "A comprehensive Bitcoin Cash (BCH) MCP server powered by mainnet-js. Provides wallet management, balance checking, sending BCH, CashTokens (genesis, minting, burning, sending), escrow contracts, QR codes, and transaction utilities.",
    version: "1.0.0",
    endpoint: "/mcp",
    author: "nickthelegend",
    repository: "https://github.com/nickthelegend/bch-mcp",
    capabilities: {
        tools: true,
        resources: true,
        prompts: false
    }
};

// MCP Config schema
const mcpConfigSchema = {
    title: "MCP Session Configuration",
    description: "Schema for the /mcp endpoint configuration",
    "x-query-style": "dot+bracket",
    type: "object",
    properties: {
        debug: {
            type: "boolean",
            default: false,
            description: "Enable debug logging"
        }
    }
};

const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`${req.method} ${pathname}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id, mcp-protocol-version");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");

    // Handle preflight OPTIONS requests
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // MCP endpoint - main endpoint
    if ((pathname === "/mcp" || pathname.endsWith("/mcp")) && req.method === "POST") {
        console.log("Handling MCP POST request on /mcp");

        // Get session ID from header
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        // Read body to check request type
        let body = "";
        req.on("data", (chunk) => { body += chunk; });

        await new Promise<void>((resolve) => req.on("end", resolve));

        let jsonBody: any;
        try {
            jsonBody = JSON.parse(body);
        } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }));
            return;
        }

        console.log("Request method:", jsonBody.method, "Session:", sessionId);

        // For initialize request, create new session
        if (jsonBody.method === "initialize") {
            const newSessionId = crypto.randomUUID();
            console.log("Creating new session:", newSessionId);

            const mcpServer = createServer({ config });
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => newSessionId,
            });

            await mcpServer.connect(transport);
            sessions.set(newSessionId, { transport, server: mcpServer });

            // Create a fake request with the body we already read
            const fakeReq = Object.assign(
                new (require("stream").Readable)({
                    read() {
                        this.push(body);
                        this.push(null);
                    }
                }),
                {
                    method: req.method,
                    url: req.url,
                    headers: { ...req.headers, "mcp-session-id": newSessionId }
                }
            );

            await transport.handleRequest(fakeReq as any, res);
            return;
        }

        // For other requests, find existing session
        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId)!;

            // Create a fake request with the body we already read
            const fakeReq = Object.assign(
                new (require("stream").Readable)({
                    read() {
                        this.push(body);
                        this.push(null);
                    }
                }),
                {
                    method: req.method,
                    url: req.url,
                    headers: req.headers
                }
            );

            await session.transport.handleRequest(fakeReq as any, res);
            return;
        }

        // No valid session
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32600, message: "Invalid Request: Session not found. Send initialize request first." },
            id: jsonBody.id || null
        }));
        return;
    }

    // Handle DELETE for session cleanup
    if (pathname === "/mcp" && req.method === "DELETE") {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId)!;
            await session.server.close();
            sessions.delete(sessionId);
            console.log("Session closed:", sessionId);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }

    // Handle MCP server card
    if (req.method === "GET" && pathname.includes(".well-known/mcp.json")) {
        console.log("Serving MCP Server Card");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mcpCard, null, 2));
        return;
    }

    // Handle MCP config schema  
    if (req.method === "GET" && pathname.includes(".well-known/mcp-config")) {
        console.log("Serving MCP Config Schema");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mcpConfigSchema, null, 2));
        return;
    }

    // Health check
    if (req.method === "GET" && (pathname === "/health" || pathname.endsWith("/health"))) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString(),
            activeSessions: sessions.size
        }));
        return;
    }

    // Root endpoint - show service info
    if (req.method === "GET" && pathname === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            name: "BCH MCP Server",
            version: "1.0.0",
            endpoints: {
                mcp: "/mcp",
                health: "/health",
                card: "/.well-known/mcp.json",
                config: "/.well-known/mcp-config"
            },
            documentation: "https://github.com/nickthelegend/bch-mcp",
            activeSessions: sessions.size
        }, null, 2));
        return;
    }

    console.log("404 - Not found:", pathname);
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found", path: pathname }));
});

// Clean up old sessions periodically (every 10 minutes)
setInterval(() => {
    console.log(`Active sessions: ${sessions.size}`);
    // Could add session timeout logic here
}, 10 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    for (const [id, session] of sessions) {
        await session.server.close();
        sessions.delete(id);
    }
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    for (const [id, session] of sessions) {
        await session.server.close();
        sessions.delete(id);
    }
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

const port = parseInt(process.env.PORT || "8081");
httpServer.listen(port, "0.0.0.0", () => {
    console.log(`BCH MCP Server listening on http://0.0.0.0:${port}`);
    console.log(`MCP endpoint: http://0.0.0.0:${port}/mcp`);
    console.log(`Health check: http://0.0.0.0:${port}/health`);
});
