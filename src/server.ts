import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createServer, { configSchema } from "./index.js";
import http from "http";

// Parse config from query parameters
function parseConfig(url: URL): any {
    const config: any = {};
    for (const [key, value] of url.searchParams) {
        // Handle dot-notation for nested config
        const keys = key.split('.');
        let current = config;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        // Try to parse as JSON, otherwise use as string
        try {
            current[keys[keys.length - 1]] = JSON.parse(value);
        } catch {
            current[keys[keys.length - 1]] = value;
        }
    }
    return config;
}

const config = configSchema.parse({
    debug: process.env.DEBUG === "true",
});

const mcpServer = createServer({ config });

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
});

await mcpServer.connect(transport);

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
        resources: false,
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
    if (pathname === "/mcp" || pathname.endsWith("/mcp")) {
        if (req.method === "POST") {
            console.log("Handling MCP POST request on /mcp");
            await transport.handleRequest(req, res);
            return;
        }
    }

    // Also handle POST on root for compatibility
    if (req.method === "POST" && pathname === "/") {
        console.log("Handling MCP POST request on /");
        await transport.handleRequest(req, res);
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
        res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
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
            documentation: "https://github.com/nickthelegend/bch-mcp"
        }, null, 2));
        return;
    }

    console.log("404 - Not found:", pathname);
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found", path: pathname }));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
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

