import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createServer, { configSchema } from "./index.js";
import http from "http";

const config = configSchema.parse({
    debug: process.env.DEBUG === "true",
});

const mcpServer = createServer({ config });

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
});

await mcpServer.connect(transport);

// MCP Server Card - serve directly (no file reading issues)
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

// MCP Config schema for .well-known/mcp-config
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
    const pathname = req.url?.split("?")[0] || "/";

    console.log(`${req.method} ${pathname}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
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

    // MCP protocol endpoint
    if (req.method === "POST") {
        console.log("Handling MCP POST request");
        await transport.handleRequest(req, res);
        return;
    }

    console.log("404 - Not found:", pathname);
    res.writeHead(404);
    res.end("Not found");
});

const port = parseInt(process.env.PORT || "8000");
httpServer.listen(port, () => {
    console.log(`MCP Server listening on port ${port}`);
});
