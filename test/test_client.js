import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function run() {
    console.log("Connecting to MCP server at http://localhost:8081/mcp...");

    const transport = new StreamableHTTPClientTransport(
        new URL("http://localhost:8081/mcp")
    );

    const client = new Client(
        {
            name: "test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        console.log("Connected successfully!");

        console.log("Listing tools...");
        const toolsResult = await client.listTools();
        console.log(`Found ${toolsResult.tools.length} tools.`);

        console.log("Executing get_bch_price...");
        const result = await client.callTool({
            name: "get_bch_price",
            arguments: {},
        });

        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        // Close transport if possible
    }
}

run();
