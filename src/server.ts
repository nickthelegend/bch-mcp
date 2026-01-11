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

const httpServer = http.createServer(async (req, res) => {
    if (req.method === "POST") {
        await transport.handleRequest(req, res);
    } else if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

const port = parseInt(process.env.PORT || "8000");
httpServer.listen(port, () => {
    console.log(`MCP Server listening on port ${port}`);
});
