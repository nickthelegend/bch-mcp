import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createServer, { configSchema } from "./index.js";
import http from "http";

const config = configSchema.parse({
    debug: process.env.DEBUG === "true",
});

const mcpServer = createServer({ config });

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

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
});

// Connect at the start, once. 
// The transport handles multiple sessions internally.
await mcpServer.connect(transport);

const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

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

    // MCP endpoint
    if ((pathname === "/mcp" || pathname === "/")) {
        if (req.method === "POST") {
            console.log(`POST ${pathname} - Session: ${req.headers["mcp-session-id"] || "new"}`);
            await transport.handleRequest(req, res);
            return;
        }
        if (req.method === "DELETE") {
            await transport.handleRequest(req, res);
            return;
        }
    }

    // Health check
    if (req.method === "GET" && (pathname === "/health" || pathname.endsWith("/health"))) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // Handle MCP server card
    if (req.method === "GET" && pathname.includes(".well-known/mcp.json")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mcpCard, null, 2));
        return;
    }

    // Root endpoint
    if (req.method === "GET" && pathname === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            name: "BCH MCP Server",
            version: "1.0.0",
            endpoints: {
                mcp: "/mcp",
                health: "/health",
                card: "/.well-known/mcp.json"
            }
        }, null, 2));
        return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found", path: pathname }));
});

const port = parseInt(process.env.PORT || "8081");
httpServer.listen(port, "0.0.0.0", () => {
    console.log(`BCH MCP Server listening on http://0.0.0.0:${port}`);
});
