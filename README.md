# BCH MCP Server

A comprehensive Bitcoin Cash (BCH) MCP server powered by mainnet-js. Provides wallet management, balance checking, sending BCH, CashTokens (genesis, minting, burning, sending), escrow contracts, QR codes, and transaction utilities.

## Features

- **Wallet Management**: Create, import, and manage BCH wallets
- **Balance & Transactions**: Check balances, send BCH, view transaction history
- **CashTokens**: Full support for fungible and non-fungible tokens
- **Escrow Contracts**: Create and manage escrow contracts
- **Utilities**: QR code generation, transaction decoding, currency conversion

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Start the server
npm start
```

The server will be available at `http://localhost:8081`.

### Docker

```bash
# Build the image
docker build -t bch-mcp-server .

# Run the container
docker run -d -p 8081:8081 --name bch-mcp bch-mcp-server
```

## Deployment to Digital Ocean

### Prerequisites

- A Digital Ocean Droplet (Ubuntu 22.04 recommended)
- A domain name (optional, for SSL)
- SSH access to your droplet

### Deployment Steps

1. **SSH into your droplet**:
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Clone the repository**:
   ```bash
   git clone https://github.com/nickthelegend/bch-mcp.git
   cd bch-mcp
   ```

3. **Make the deployment script executable**:
   ```bash
   chmod +x run.sh
   ```

4. **Run the deployment script**:
   ```bash
   ./run.sh
   ```

   The script will present options:
   - **Option 1**: Deploy without SSL (HTTP only) - Use this for testing
   - **Option 2**: Deploy with SSL and custom domain - Use this for production

### DNS Configuration

If you want to use a custom domain:

1. **Add an A Record** in your DNS provider:
   - **Host**: `@` or subdomain (e.g., `mcp`)
   - **Points to**: Your Droplet's IP address
   - **TTL**: 300 (5 minutes)

2. **Wait for DNS propagation** (can take up to 24 hours, usually faster)

3. **Run the deployment script with Option 2** and enter your domain

### Manual Deployment (Without Script)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Build and run
docker build -t bch-mcp-server .
docker run -d -p 8081:8081 --name bch-mcp --restart unless-stopped bch-mcp-server
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /mcp` | Main MCP endpoint for tool calls |
| `GET /health` | Health check endpoint |
| `GET /.well-known/mcp.json` | MCP server card (metadata) |
| `GET /.well-known/mcp-config` | MCP configuration schema |
| `GET /` | Server info and available endpoints |

## Available MCP Tools

### Wallet Management
- `wallet_create` - Create a new wallet
- `wallet_from_id` - Get wallet info from ID

### Balance & Transactions
- `get_balance` - Get wallet balance
- `send` - Send BCH to addresses
- `send_max` - Send all available funds
- `get_history` - Get transaction history

### CashTokens
- `token_genesis` - Create new token category
- `token_send` - Send tokens
- `token_mint` - Mint new tokens
- `token_burn` - Burn tokens
- `get_token_balance` - Get token balance
- `get_all_token_balances` - Get all token balances

### Utilities
- `qr_address` - Generate QR code for address
- `convert_currency` - Convert between BCH/SAT/USD
- `decode_transaction` - Decode transaction hex

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | Server port |
| `DEBUG` | `false` | Enable debug logging |
| `NODE_ENV` | `production` | Node environment |

## Monitoring

Check the server health:
```bash
curl http://your-server:8081/health
```

View container logs:
```bash
docker logs -f bch-mcp-server
```

## Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

## License

MIT

## Author

[nickthelegend](https://github.com/nickthelegend)
