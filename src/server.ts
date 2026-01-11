import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createServer, { configSchema } from "./index.js";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = configSchema.parse({
    debug: process.env.DEBUG === "true",
});

const mcpServer = createServer({ config });

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
});

await mcpServer.connect(transport);

// MCP Server Card
const mcpCard = {
    name: "BCH MCP Server",
    description: "A comprehensive Bitcoin Cash (BCH) MCP server powered by mainnet-js. Provides wallet management, balance checking, sending BCH, CashTokens (genesis, minting, burning, sending), escrow contracts, QR codes, and transaction utilities.",
    version: "1.0.0",
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
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === "POST") {
        await transport.handleRequest(req, res);
    } else if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
    } else if (req.method === "GET" && req.url === "/.well-known/mcp.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mcpCard, null, 2));
    } else if (req.method === "GET" && req.url === "/.well-known/mcp-config") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mcpConfigSchema, null, 2));
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

const port = parseInt(process.env.PORT || "8000");
httpServer.listen(port, () => {
    console.log(`MCP Server listening on port ${port}`);
});
