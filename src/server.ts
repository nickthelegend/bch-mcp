import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createServer, { configSchema } from "./index.js";
import http from "http";
import fs from "fs";
import path from "path";

const config = configSchema.parse({
    debug: process.env.DEBUG === "true",
});

const mcpServer = createServer({ config });

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
});

await mcpServer.connect(transport);

// Load MCP Server Card from file - use process.cwd() for Docker compatibility
const mcpCardPath = path.join(process.cwd(), "public/.well-known/mcp.json");
let mcpCard: object;
try {
    mcpCard = JSON.parse(fs.readFileSync(mcpCardPath, "utf-8"));
    console.log("Loaded MCP Server Card from", mcpCardPath);
} catch (e) {
    console.error("Failed to load MCP Server Card from", mcpCardPath, e);
    // Fallback - serve directly
    mcpCard = {
        name: "bch-mcp",
        description: "Bitcoin Cash privacy & tooling MCP server",
        version: "1.0.0",
        endpoint: "/mcp"
    };
}

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
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`${req.method} ${pathname}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // Handle MCP server card - match multiple patterns
    if (req.method === "GET" && (
        pathname === "/.well-known/mcp.json" ||
        pathname === "/.well-known/mcp" ||
        pathname.endsWith("/.well-known/mcp.json") ||
        pathname.endsWith("/.well-known/mcp")
    )) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mcpCard, null, 2));
        return;
    }

    // Handle MCP config schema
    if (req.method === "GET" && (
        pathname === "/.well-known/mcp-config" ||
        pathname.endsWith("/.well-known/mcp-config")
    )) {
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

    // MCP protocol endpoint - handle both /mcp and root POST
    if (req.method === "POST" && (pathname === "/mcp" || pathname === "/" || pathname.endsWith("/mcp"))) {
        await transport.handleRequest(req, res);
        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

const port = parseInt(process.env.PORT || "8000");
httpServer.listen(port, () => {
    console.log(`MCP Server listening on port ${port}`);
});
