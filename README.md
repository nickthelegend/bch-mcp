# BCH MCP Server

A comprehensive Bitcoin Cash (BCH) MCP server powered by mainnet-js. Provides wallet management, balance checking, sending BCH, CashTokens (genesis, minting, burning, sending), escrow contracts, QR codes, and transaction utilities.

## 🌐 Live Server

**Production URL:** `https://mcp.cashlabs.dev/mcp`

| Endpoint | URL |
|----------|-----|
| **MCP Endpoint** | `https://mcp.cashlabs.dev/mcp` |
| **Health Check** | `https://mcp.cashlabs.dev/health` |
| **Server Info** | `https://mcp.cashlabs.dev/` |
| **MCP Card** | `https://mcp.cashlabs.dev/.well-known/mcp.json` |

### MCP Client Configuration

```json
{
  "mcpServers": {
    "bch-mcp": {
      "url": "https://mcp.cashlabs.dev/mcp"
    }
  }
}
```

---

## 📋 Available Tools (40+)

### 🔐 Wallet Management

| Tool | Description | Example Input |
|------|-------------|---------------|
| `wallet_create` | Create a new random wallet | `{ "network": "testnet", "type": "seed" }` |
| `wallet_from_id` | Get wallet info from walletId | `{ "walletId": "wif:testnet:..." }` |
| `wallet_from_seed` | Restore wallet from mnemonic | `{ "seedPhrase": "word1 word2...", "network": "testnet" }` |
| `wallet_from_wif` | Restore wallet from WIF private key | `{ "wif": "cNfsP...", "network": "testnet" }` |
| `wallet_watch_only` | Create watch-only wallet | `{ "cashaddr": "bchtest:qq...", "network": "testnet" }` |
| `get_deposit_address` | Get deposit addresses | `{ "walletId": "wif:testnet:..." }` |
| `get_public_key` | Get public key and hash | `{ "walletId": "wif:testnet:..." }` |

### 💰 Balance & UTXOs

| Tool | Description | Example Input |
|------|-------------|---------------|
| `get_balance` | Get wallet balance | `{ "walletId": "wif:testnet:...", "unit": "bch" }` |
| `get_utxos` | Get unspent transaction outputs | `{ "walletId": "wif:testnet:..." }` |
| `get_max_amount_to_send` | Get max sendable amount | `{ "walletId": "wif:testnet:...", "outputCount": 1 }` |

### 📤 Sending Transactions

| Tool | Description | Example Input |
|------|-------------|---------------|
| `send` | Send BCH to addresses | `{ "walletId": "...", "to": [{ "cashaddr": "...", "value": 0.001, "unit": "bch" }] }` |
| `send_max` | Send all funds to address | `{ "walletId": "...", "address": "bchtest:qq..." }` |
| `op_return_send` | Send with OP_RETURN data | `{ "walletId": "...", "data": ["MEMO", "Hello"] }` |
| `encode_transaction` | Build tx without broadcasting | `{ "walletId": "...", "to": [...] }` |
| `submit_transaction` | Broadcast signed tx hex | `{ "walletId": "...", "transactionHex": "0200..." }` |

### 📜 History & Blockchain

| Tool | Description | Example Input |
|------|-------------|---------------|
| `get_history` | Get transaction history | `{ "walletId": "...", "unit": "bch", "count": 10 }` |
| `get_raw_history` | Get raw tx history | `{ "walletId": "..." }` |
| `get_block_height` | Get current block height | `{ "network": "testnet" }` |
| `decode_transaction` | Decode tx by hash/hex | `{ "transaction": "abc123...", "loadInputValues": true }` |

### 🪙 CashTokens (Fungible & NFT)

| Tool | Description | Example Input |
|------|-------------|---------------|
| `token_genesis` | Create new token category | `{ "walletId": "...", "amount": "1000000", "capability": "minting" }` |
| `token_send` | Send tokens | `{ "walletId": "...", "tokenId": "...", "amount": "100", "cashaddr": "..." }` |
| `token_mint` | Mint new NFT tokens | `{ "walletId": "...", "tokenId": "...", "requests": [...] }` |
| `token_burn` | Burn tokens | `{ "walletId": "...", "tokenId": "...", "amount": "10" }` |
| `get_token_balance` | Get token balance | `{ "walletId": "...", "tokenId": "..." }` |
| `get_all_token_balances` | Get all FT balances | `{ "walletId": "..." }` |
| `get_nft_token_balance` | Get NFT count | `{ "walletId": "...", "tokenId": "..." }` |
| `get_all_nft_token_balances` | Get all NFT balances | `{ "walletId": "..." }` |
| `get_token_utxos` | Get token UTXOs | `{ "walletId": "...", "tokenId": "..." }` |
| `get_token_deposit_address` | Get token deposit address | `{ "walletId": "..." }` |

### 🔒 Escrow Contracts

| Tool | Description | Example Input |
|------|-------------|---------------|
| `escrow_create` | Create escrow contract | `{ "arbiterAddr": "...", "buyerAddr": "...", "sellerAddr": "...", "amount": "10000" }` |
| `escrow_get_balance` | Get escrow balance | `{ "contractId": "escrow:testnet:..." }` |
| `escrow_spend` | Release to seller | `{ "contractId": "...", "wif": "..." }` |
| `escrow_refund` | Refund to buyer | `{ "contractId": "...", "wif": "..." }` |

### ✍️ Signing & Verification

| Tool | Description | Example Input |
|------|-------------|---------------|
| `sign_message` | Sign message with wallet | `{ "walletId": "...", "message": "Hello World" }` |
| `verify_message` | Verify message signature | `{ "walletId": "...", "message": "...", "signature": "..." }` |

### 💱 Price & Conversion

| Tool | Description | Example Input |
|------|-------------|---------------|
| `get_bch_price` | Get current BCH/USD price | `{}` |
| `convert_currency` | Convert BCH/SAT/USD | `{ "amount": 100, "from": "usd", "to": "sat" }` |

### 🛠️ Utilities

| Tool | Description | Example Input |
|------|-------------|---------------|
| `qr_address` | Generate QR code for address | `{ "address": "bchtest:qq...", "size": 256 }` |
| `validate_address` | Validate BCH address | `{ "address": "bchtest:qq..." }` |
| `wait_for_transaction` | Wait for incoming tx | `{ "walletId": "..." }` |
| `wait_for_balance` | Wait for target balance | `{ "walletId": "...", "value": 0.01, "unit": "bch" }` |

### 🧪 Testnet

| Tool | Description | Example Input |
|------|-------------|---------------|
| `get_testnet_satoshis` | Get free testnet coins | `{ "walletId": "..." }` |
| `return_testnet_satoshis` | Return coins to faucet | `{ "walletId": "..." }` |

---

## 📚 MCP Resources (21 Documentation Guides)

Agents can fetch documentation resources for context:

### Core Guides
| Resource URI | Description |
|--------------|-------------|
| `docs://overview` | BCH MCP Server overview and quick start |
| `docs://wallets` | Wallet management - create, restore, watch-only |
| `docs://transactions` | Sending BCH - standard, max, OP_RETURN |
| `docs://cashtokens` | CashTokens - genesis, mint, send, burn |
| `docs://escrow` | Escrow contracts for secure transactions |
| `docs://utilities` | QR codes, price conversion, signing |

### Reference Guides
| Resource URI | Description |
|--------------|-------------|
| `docs://bch-basics` | Bitcoin Cash fundamentals - units, confirmations |
| `docs://addresses` | Address formats - CashAddr, token addresses |
| `docs://smart-contracts` | CashScript - escrow, multisig, covenants |
| `docs://bcmr` | BCMR - token metadata registries |
| `docs://network` | Network info - mainnet, testnet, nodes |

### Developer Resources
| Resource URI | Description |
|--------------|-------------|
| `docs://api-reference` | Complete API reference for all tools |
| `docs://examples` | Code examples for common operations |
| `docs://faq` | Frequently asked questions |
| `docs://developer-resources` | Tools, APIs, explorers, community |
| `docs://security` | Security best practices |

### CashScript Documentation
| Resource URI | Description |
|--------------|-------------|
| `docs://cashscript` | What is CashScript - smart contract language |
| `docs://cashscript-language` | Language reference - types, operators, statements |
| `docs://cashscript-globals` | Global variables - tx introspection, time locks |
| `docs://cashscript-covenants` | Covenants guide - restrict spending, state |
| `docs://cashscript-sdk` | TypeScript SDK - Contract, TransactionBuilder |

---


## 🚀 Quick Start

### Using the Live Server

Connect your MCP client to `https://mcp.cashlabs.dev/mcp`

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

---

## 🌍 Deployment to Digital Ocean

### Prerequisites

- A Digital Ocean Droplet (Ubuntu 22.04 recommended)
- A domain name (optional, for SSL)
- SSH access to your droplet

### Quick Deploy

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Clone the repository
git clone https://github.com/nickthelegend/bch-mcp.git
cd bch-mcp

# Make deployment script executable and run
chmod +x run.sh
./run.sh
```

### DNS Configuration

Add an **A Record** in your DNS provider:
- **Host**: `mcp` (or `@` for root)
- **Value**: Your Droplet's IP address
- **TTL**: 300

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/mcp` | Main MCP endpoint for tool calls |
| `GET` | `/health` | Health check endpoint |
| `GET` | `/` | Server info and endpoints |
| `GET` | `/.well-known/mcp.json` | MCP server card (metadata) |
| `GET` | `/.well-known/mcp-config` | MCP configuration schema |

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | Server port |
| `DEBUG` | `false` | Enable debug logging |
| `NODE_ENV` | `production` | Node environment |

---

## 📖 Usage Examples

### Create a Testnet Wallet
```json
{
  "tool": "wallet_create",
  "input": { "network": "testnet", "type": "seed" }
}
```

### Get Free Testnet Coins
```json
{
  "tool": "get_testnet_satoshis",
  "input": { "walletId": "wif:testnet:cNfsP..." }
}
```

### Send BCH
```json
{
  "tool": "send",
  "input": {
    "walletId": "wif:testnet:...",
    "to": [
      { "cashaddr": "bchtest:qq...", "value": 1000, "unit": "sat" }
    ]
  }
}
```

### Create CashToken
```json
{
  "tool": "token_genesis",
  "input": {
    "walletId": "wif:testnet:...",
    "amount": "1000000",
    "capability": "minting"
  }
}
```

### Create Escrow Contract
```json
{
  "tool": "escrow_create",
  "input": {
    "arbiterAddr": "bchtest:qq...",
    "buyerAddr": "bchtest:qq...",
    "sellerAddr": "bchtest:qq...",
    "amount": "50000",
    "network": "testnet"
  }
}
```

---

## 📦 Monitoring

```bash
# Check server health
curl https://mcp.cashlabs.dev/health

# View container logs
docker logs -f bch-mcp-server
```

---

## 🔄 Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker stop bch-mcp-server
docker rm bch-mcp-server
docker build -t bch-mcp-server .
docker run -d --name bch-mcp-server --network mcp-net --restart unless-stopped -e PORT=8081 bch-mcp-server
```

---

## 📜 License

MIT

## 👤 Author

[nickthelegend](https://github.com/nickthelegend)
