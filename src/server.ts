import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createServer, { configSchema } from "./index.js";
import http from "http";

// Parse config from query parameters (Smithery passes config as dot-notation query params)
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

// MCP Server Card (optional metadata)
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

    // CORS headers - properly configured for Smithery
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, *");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");

    // Handle preflight OPTIONS requests
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // MCP endpoint - this is the main endpoint Smithery uses
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
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }

    console.log("404 - Not found:", pathname);
    res.writeHead(404);
    res.end("Not found");
});

// Smithery sets PORT to 8081
const port = parseInt(process.env.PORT || "8081");
httpServer.listen(port, () => {
    console.log(`MCP Server listening on port ${port}`);
});
