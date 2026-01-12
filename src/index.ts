import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
	Wallet,
	TestNetWallet,
	walletFromId,
	NFTCapability,
	TokenSendRequest,
	TokenMintRequest,
	OpReturnData,
	UnitEnum,
	convert,
	Network
} from "mainnet-js"
import { EscrowContract } from "@mainnet-cash/contract"
import QRCode from "qrcode-svg"

// Helper to serialize BigInt to string for JSON output
function serialize(obj: any): any {
	if (obj === null || obj === undefined) return obj;
	return JSON.parse(JSON.stringify(obj, (key, value) =>
		typeof value === 'bigint' ? value.toString() : value
	));
}

export const configSchema = z.object({
	debug: z.boolean().default(false).describe("Enable debug logging"),
})

// Documentation content for resources
const DOCS = {
	overview: `# Bitcoin Cash (BCH) MCP Server

A comprehensive MCP server for Bitcoin Cash operations powered by mainnet-js.

## Features
- **Wallet Management**: Create, restore, and manage BCH wallets
- **Transactions**: Send BCH, check balances, view history
- **CashTokens**: Full fungible and NFT token support
- **Escrow**: Non-custodial escrow smart contracts
- **Utilities**: QR codes, price conversion, address validation

## Quick Start
1. Create a wallet: \`wallet_create\`
2. Get testnet coins: \`get_testnet_satoshis\`
3. Check balance: \`get_balance\`
4. Send BCH: \`send\`

## Networks
- **mainnet**: Production Bitcoin Cash network
- **testnet**: Test network with free test coins
- **regtest**: Local development network

## Available Documentation
- \`docs://wallets\` - Wallet management guide
- \`docs://transactions\` - Transaction guide
- \`docs://cashtokens\` - CashTokens guide
- \`docs://escrow\` - Escrow contracts guide
- \`docs://utilities\` - Utilities guide
- \`docs://bch-basics\` - Bitcoin Cash fundamentals
- \`docs://addresses\` - Address formats guide
- \`docs://smart-contracts\` - CashScript smart contracts
- \`docs://bcmr\` - Bitcoin Cash Metadata Registries
- \`docs://network\` - Network information
- \`docs://api-reference\` - Complete API reference
- \`docs://examples\` - Code examples
- \`docs://faq\` - Frequently asked questions
- \`docs://developer-resources\` - Developer tools and services
- \`docs://security\` - Security best practices`,

	wallets: `# Wallet Management

## Creating Wallets

### wallet_create
Create a new random wallet.
\`\`\`json
{ "network": "testnet", "type": "seed" }
\`\`\`

### wallet_from_seed
Restore from mnemonic seed phrase.
\`\`\`json
{ "seedPhrase": "word1 word2 ... word12", "derivationPath": "m/44'/0'/0'/0/0", "network": "testnet" }
\`\`\`

### wallet_from_wif
Restore from WIF private key.
\`\`\`json
{ "wif": "cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6", "network": "testnet" }
\`\`\`

### wallet_watch_only
Create watch-only wallet (view balance, can't spend).
\`\`\`json
{ "cashaddr": "bchtest:qq...", "network": "testnet" }
\`\`\`

## Wallet ID Format
Wallets are identified by a walletId string:
- \`wif:testnet:cNfsP...\` - WIF format
- \`seed:testnet:word1 word2...:m/44'/0'/0'/0/0\` - Seed format

## Derivation Paths
- \`m/44'/0'/0'/0/0\` - Bitcoin.com wallet (default)
- \`m/44'/145'/0'/0/0\` - Electron Cash
- \`m/44'/245'/0'/0/0\` - SLP tokens

## Security Notes
- Never share your seed phrase or WIF
- Store walletIds securely
- Use watch-only wallets for monitoring`,

	transactions: `# Transactions

## Sending BCH

### send
Send BCH to one or more recipients.
\`\`\`json
{
  "walletId": "wif:testnet:...",
  "to": [
    { "cashaddr": "bchtest:qq...", "value": 0.001, "unit": "bch" }
  ]
}
\`\`\`

### send_max
Send all available funds to an address.
\`\`\`json
{ "walletId": "wif:testnet:...", "address": "bchtest:qq..." }
\`\`\`

### op_return_send
Send a transaction with OP_RETURN data.
\`\`\`json
{ "walletId": "wif:testnet:...", "data": ["MEMO", "Hello World"] }
\`\`\`

## Transaction Building

### encode_transaction
Build a transaction without broadcasting (returns hex).
\`\`\`json
{
  "walletId": "wif:testnet:...",
  "to": [{ "cashaddr": "bchtest:qq...", "value": 1000, "unit": "sat" }]
}
\`\`\`

### submit_transaction
Broadcast a signed transaction hex.
\`\`\`json
{ "walletId": "wif:testnet:...", "transactionHex": "0200000001..." }
\`\`\`

## Fees
- BCH uses approximately 1 sat/byte for fees
- Use \`get_max_amount_to_send\` to calculate sendable amount minus fees
- Average transaction is ~250 bytes = ~250 sats fee (~$0.001)

## Units
- **bch**: Bitcoin Cash (1 BCH)
- **sat** or **satoshis**: Smallest unit (1 BCH = 100,000,000 sats)
- **usd**: US Dollars (converted at current rate)`,

	cashtokens: `# CashTokens

CashTokens are Bitcoin Cash's native token system supporting both fungible tokens (FT) and non-fungible tokens (NFT).

## Overview
- Activated May 2023 via CHIP-2022-02
- Native UTXO-based tokens (not a second layer)
- No special indexer required
- Supports both fungible and non-fungible tokens
- Max 9,223,372,036,854,775,807 fungible tokens per category

## Token Genesis

### token_genesis
Create a new token category.
\`\`\`json
{
  "walletId": "wif:testnet:...",
  "amount": "1000000",
  "commitment": "abcd",
  "capability": "minting",
  "cashaddr": "bchtest:qq..."
}
\`\`\`

## NFT Capabilities
- **none**: Immutable NFT - cannot be changed or mint new tokens
- **mutable**: Can change its commitment when spent
- **minting**: Can create new NFT tokens of the same category

## Token Operations

### token_send
Send tokens to an address.
\`\`\`json
{
  "walletId": "wif:testnet:...",
  "tokenId": "abc123...",
  "amount": "100",
  "cashaddr": "bchtest:qq..."
}
\`\`\`

### token_mint
Mint new NFT tokens (requires minting capability).
\`\`\`json
{
  "walletId": "wif:testnet:...",
  "tokenId": "abc123...",
  "requests": [
    { "cashaddr": "bchtest:qq...", "commitment": "01", "capability": "none" }
  ]
}
\`\`\`

### token_burn
Burn tokens permanently.
\`\`\`json
{
  "walletId": "wif:testnet:...",
  "tokenId": "abc123...",
  "amount": "10"
}
\`\`\`

## Token Balances
- \`get_token_balance\`: Get balance of specific token
- \`get_all_token_balances\`: Get all FT balances
- \`get_nft_token_balance\`: Get NFT count
- \`get_all_nft_token_balances\`: Get all NFT balances
- \`get_token_utxos\`: Get UTXOs containing tokens

## Token Addresses
Use \`tokenaddr\` instead of \`cashaddr\` for receiving tokens.
Token addresses have a different prefix to signal token support.`,

	escrow: `# Escrow Contracts

Non-custodial escrow for secure peer-to-peer transactions.

## How Escrow Works
1. **Create**: Arbiter, buyer, and seller addresses are locked into contract
2. **Fund**: Buyer sends funds to contract address
3. **Release**: Buyer or arbiter releases funds to seller (spend)
4. **Refund**: Seller or arbiter can refund to buyer

## Usage

### escrow_create
Create a new escrow contract.
\`\`\`json
{
  "arbiterAddr": "bchtest:qq...",
  "buyerAddr": "bchtest:qq...",
  "sellerAddr": "bchtest:qq...",
  "amount": "10000",
  "network": "testnet"
}
\`\`\`
Returns a contract ID and deposit address.

### escrow_get_balance
Check escrow contract balance.
\`\`\`json
{ "contractId": "escrow:testnet:..." }
\`\`\`

### escrow_spend
Release funds to seller (buyer or arbiter can call).
\`\`\`json
{ "contractId": "escrow:testnet:...", "wif": "cNfsP..." }
\`\`\`

### escrow_refund
Refund funds to buyer (seller or arbiter can call).
\`\`\`json
{ "contractId": "escrow:testnet:...", "wif": "cNfsP..." }
\`\`\`

## Minimum Amounts
- Escrow contracts require ~3700 satoshis minimum due to contract size
- Include enough for fees (add ~1000 sats buffer)`,

	utilities: `# Utilities

## Price & Conversion

### get_bch_price
Get current BCH price in USD.
\`\`\`json
{}
\`\`\`

### convert_currency
Convert between BCH, satoshis, and USD.
\`\`\`json
{ "amount": 100, "from": "usd", "to": "sat" }
\`\`\`

## QR Codes

### qr_address
Generate QR code for an address.
\`\`\`json
{ "address": "bchtest:qq...", "size": 256 }
\`\`\`

## Blockchain Info

### get_block_height
Get current blockchain height.
\`\`\`json
{ "network": "testnet" }
\`\`\`

### decode_transaction
Decode transaction by hash or hex.
\`\`\`json
{ "transaction": "abc123...", "loadInputValues": true }
\`\`\`

## Address Tools

### validate_address
Validate a BCH address.
\`\`\`json
{ "address": "bchtest:qq..." }
\`\`\`

### get_deposit_address
Get deposit addresses for a wallet.
\`\`\`json
{ "walletId": "wif:testnet:..." }
\`\`\`

## Signing

### sign_message
Sign a message with wallet's private key.
\`\`\`json
{ "walletId": "wif:testnet:...", "message": "Hello World" }
\`\`\`

### verify_message
Verify a message signature.
\`\`\`json
{ "walletId": "wif:testnet:...", "message": "Hello World", "signature": "H/9jM..." }
\`\`\``,

	bchBasics: `# Bitcoin Cash Fundamentals

## What is Bitcoin Cash?
Bitcoin Cash (BCH) is a peer-to-peer electronic cash system that forked from Bitcoin in August 2017. It focuses on low fees, fast confirmations, and scalability.

## Key Features
- **Low Fees**: Typically less than $0.01 per transaction
- **Fast Confirmations**: ~10 minute blocks, 0-conf for small amounts
- **Large Blocks**: Up to 32MB (adaptive since 2024)
- **Smart Contracts**: CashScript for advanced contracts
- **Native Tokens**: CashTokens for fungible and NFT tokens

## Units
| Unit | Satoshis | BCH |
|------|----------|-----|
| 1 satoshi | 1 | 0.00000001 |
| 1 bit | 100 | 0.000001 |
| 1 BCH | 100,000,000 | 1 |

## Transaction Types
- **P2PKH**: Pay to Public Key Hash (standard)
- **P2SH**: Pay to Script Hash (multisig, contracts)
- **OP_RETURN**: Data storage (up to 220 bytes)

## Confirmations
- **0-conf**: Instant, good for small amounts
- **1 confirmation**: ~10 minutes, secure for most uses
- **6 confirmations**: ~1 hour, highly secure

## Block Time
- Target: 10 minutes
- Difficulty adjustment: Every block (DAA algorithm)`,

	addresses: `# Bitcoin Cash Address Formats

## CashAddr Format
Modern BCH address format introduced in 2018.

### Structure
\`bitcoincash:qp....\` or \`bchtest:qp....\`

### Prefixes
- \`bitcoincash:\` - Mainnet
- \`bchtest:\` - Testnet  
- \`bchreg:\` - Regtest

### Types (first letter after colon)
- \`q\` - P2PKH (pay to public key hash)
- \`p\` - P2SH (pay to script hash)
- \`z\` - Token-aware P2PKH
- \`r\` - Token-aware P2SH

## Token Addresses
For receiving CashTokens, use the token-aware address format:
- Regular: \`bitcoincash:qp...\`
- Token: \`bitcoincash:zp...\`

Use \`get_token_deposit_address\` to get the correct format.

## Legacy Format
Old Bitcoin-style addresses starting with 1 or 3.
- Still supported but CashAddr is preferred
- \`1...\` - P2PKH
- \`3...\` - P2SH

## Address Derivation
From private key:
1. Generate public key (ECDSA secp256k1)
2. SHA256 + RIPEMD160 = Public Key Hash
3. Add version byte
4. Bech32 encode

## Best Practices
- Always verify address format before sending
- Use \`validate_address\` tool to check addresses
- Double-check network (mainnet vs testnet)`,

	smartContracts: `# Smart Contracts on Bitcoin Cash

## CashScript
CashScript is a high-level language for BCH smart contracts, similar to Solidity.

### Example: Pay with Timeout
\`\`\`solidity
pragma cashscript ^0.8.0;

contract TransferWithTimeout(
    pubkey sender,
    pubkey recipient,
    int timeout
) {
    function transfer(sig recipientSig) {
        require(checkSig(recipientSig, recipient));
    }

    function timeout(sig senderSig) {
        require(checkSig(senderSig, sender));
        require(tx.time >= timeout);
    }
}
\`\`\`

## Contract Types

### Escrow
Three-party contract: buyer, seller, arbiter.
- Buyer or arbiter can release to seller
- Seller or arbiter can refund to buyer

### Multi-signature
Requires M of N signatures to spend.
\`\`\`
require(checkMultiSig([sig1, sig2], [pk1, pk2, pk3]));
\`\`\`

### Time-locked
Funds locked until a specific time or block height.
\`\`\`
require(tx.time >= locktime);
\`\`\`

### Covenants
Restrict how outputs can be spent.
\`\`\`
require(tx.outputs[0].lockingBytecode == expectedBytecode);
\`\`\`

## Opcodes
BCH supports additional opcodes for advanced contracts:
- Native introspection (tx.inputs, tx.outputs)
- 64-bit integers
- BigInt math operations

## Resources
- CashScript: https://cashscript.org
- Playground: https://playground.cashscript.org`,

	bcmr: `# BCMR - Bitcoin Cash Metadata Registries

BCMR (CHIP-2022-02-BCMR) is a standard for publishing and resolving metadata about tokens and identities on Bitcoin Cash.

## What is BCMR?
- Decentralized metadata registry
- Links token IDs to names, symbols, icons
- Uses on-chain authentication via authchains

## Identity Snapshots
A BCMR registry contains identity information:
\`\`\`json
{
  "name": "My Token",
  "description": "A sample token",
  "symbol": "MTK",
  "decimals": 8,
  "uris": {
    "icon": "ipfs://...",
    "web": "https://example.com"
  }
}
\`\`\`

## Authchains
Authchains authenticate registry updates:
1. Genesis transaction creates authhead
2. Child transactions form chain
3. Latest transaction is current authhead
4. OP_RETURN contains registry hash or URI

## Resolving Metadata
\`\`\`javascript
// Using mainnet-js
const authChain = await BCMR.buildAuthChain({
  transactionHash: txHash,
  followToHead: true
});
\`\`\`

## Publishing Metadata
1. Create registry JSON file
2. Host on HTTPS or IPFS
3. Create OP_RETURN transaction with hash/URI
4. Token ID = first transaction hash in authchain

## Benefits
- No central authority
- On-chain authentication
- Works with any CashToken
- IPFS support for decentralization`,

	network: `# Bitcoin Cash Network Information

## Networks

### Mainnet
- **Purpose**: Production network with real value
- **Address Prefix**: \`bitcoincash:\`
- **Default Port**: 8333
- **Block Explorer**: https://blockchair.com/bitcoin-cash

### Testnet (testnet4)
- **Purpose**: Testing without real funds
- **Address Prefix**: \`bchtest:\`
- **Faucet**: Use \`get_testnet_satoshis\` tool
- **Block Explorer**: https://chipnet.imaginary.cash

### Regtest
- **Purpose**: Local development
- **Address Prefix**: \`bchreg:\`
- **Features**: Instant blocks, unlimited coins

## Block Information
- **Block Time**: ~10 minutes target
- **Block Size**: Up to 32MB (adaptive)
- **Difficulty Adjustment**: Every block (DAA)
- **Halving**: Every 210,000 blocks

## Current Stats (approximate)
- **Block Height**: ~850,000+
- **Hash Rate**: ~3-5 EH/s
- **Node Count**: ~1,000+
- **Transaction Capacity**: ~100+ tx/sec

## Electrum Servers
Mainnet-js connects via Electrum protocol:
- \`wss://bch.imaginary.cash:50004\`
- \`wss://electroncash.de:60002\`

## Full Nodes
- Bitcoin Cash Node (BCHN): https://bitcoincashnode.org
- Bitcoin Unlimited: https://www.bitcoinunlimited.info
- Flowee: https://flowee.org`,

	apiReference: `# API Reference

## Tool Categories

### Wallet Management
| Tool | Description |
|------|-------------|
| wallet_create | Create new random wallet |
| wallet_from_id | Get wallet from ID |
| wallet_from_seed | Restore from seed phrase |
| wallet_from_wif | Restore from WIF |
| wallet_watch_only | Create watch-only wallet |
| get_deposit_address | Get deposit addresses |
| get_public_key | Get public key info |

### Balance & UTXOs
| Tool | Description |
|------|-------------|
| get_balance | Get wallet balance |
| get_utxos | Get unspent outputs |
| get_max_amount_to_send | Calculate max sendable |

### Transactions
| Tool | Description |
|------|-------------|
| send | Send BCH |
| send_max | Send all funds |
| op_return_send | Send with OP_RETURN |
| encode_transaction | Build without broadcast |
| submit_transaction | Broadcast transaction |
| get_history | Get tx history |
| get_raw_history | Get raw history |
| decode_transaction | Decode tx |

### CashTokens
| Tool | Description |
|------|-------------|
| token_genesis | Create token |
| token_send | Send tokens |
| token_mint | Mint NFTs |
| token_burn | Burn tokens |
| get_token_balance | Get FT balance |
| get_all_token_balances | All FT balances |
| get_nft_token_balance | Get NFT count |
| get_all_nft_token_balances | All NFT balances |
| get_token_utxos | Token UTXOs |
| get_token_deposit_address | Token address |

### Escrow
| Tool | Description |
|------|-------------|
| escrow_create | Create contract |
| escrow_get_balance | Check balance |
| escrow_spend | Release to seller |
| escrow_refund | Refund to buyer |

### Utilities
| Tool | Description |
|------|-------------|
| get_bch_price | BCH/USD price |
| convert_currency | Convert units |
| qr_address | Generate QR |
| validate_address | Validate address |
| get_block_height | Block height |
| sign_message | Sign message |
| verify_message | Verify signature |

### Waiting/Watching
| Tool | Description |
|------|-------------|
| wait_for_transaction | Wait for tx |
| wait_for_balance | Wait for balance |

### Testnet
| Tool | Description |
|------|-------------|
| get_testnet_satoshis | Get test coins |
| return_testnet_satoshis | Return coins |`,

	examples: `# Code Examples

## Create Wallet and Get Testnet Coins
\`\`\`json
// Step 1: Create wallet
{ "tool": "wallet_create", "input": { "network": "testnet" } }
// Returns: walletId, cashaddr, mnemonic

// Step 2: Get testnet coins
{ "tool": "get_testnet_satoshis", "input": { "walletId": "wif:testnet:..." } }

// Step 3: Check balance
{ "tool": "get_balance", "input": { "walletId": "wif:testnet:...", "unit": "sat" } }
\`\`\`

## Send BCH Transaction
\`\`\`json
{
  "tool": "send",
  "input": {
    "walletId": "wif:testnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    "to": [
      { "cashaddr": "bchtest:qqfx3wcg8ts09mt5l3zj06wenapyfqq2qz4d9uxqpf", "value": 1000, "unit": "sat" }
    ]
  }
}
\`\`\`

## Create CashToken
\`\`\`json
// Step 1: Create fungible token with minting NFT
{
  "tool": "token_genesis",
  "input": {
    "walletId": "wif:testnet:...",
    "amount": "1000000",
    "capability": "minting"
  }
}
// Returns: tokenId (category ID)

// Step 2: Mint additional NFTs
{
  "tool": "token_mint",
  "input": {
    "walletId": "wif:testnet:...",
    "tokenId": "abc123...",
    "requests": [
      { "cashaddr": "bchtest:...", "commitment": "01", "capability": "none" },
      { "cashaddr": "bchtest:...", "commitment": "02", "capability": "none" }
    ]
  }
}
\`\`\`

## Setup Escrow
\`\`\`json
// Step 1: Create escrow contract
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
// Returns: contractId, depositAddress

// Step 2: Buyer funds the escrow (external send)
// Step 3: Check balance
{ "tool": "escrow_get_balance", "input": { "contractId": "escrow:testnet:..." } }

// Step 4a: Release to seller (buyer or arbiter)
{ "tool": "escrow_spend", "input": { "contractId": "...", "wif": "buyerWIF" } }

// OR Step 4b: Refund to buyer (seller or arbiter)
{ "tool": "escrow_refund", "input": { "contractId": "...", "wif": "sellerWIF" } }
\`\`\`

## Message Signing
\`\`\`json
// Sign a message
{
  "tool": "sign_message",
  "input": {
    "walletId": "wif:testnet:...",
    "message": "I agree to the terms"
  }
}

// Verify the signature
{
  "tool": "verify_message",
  "input": {
    "walletId": "wif:testnet:...",
    "message": "I agree to the terms",
    "signature": "H/9jMOnj4MFbH3d7t4yCQ9i7DgZU/VZ278w3..."
  }
}
\`\`\``,

	faq: `# Frequently Asked Questions

## General

### What networks are supported?
- **mainnet**: Real BCH with real value
- **testnet**: Free test coins for development
- **regtest**: Local development network

### What's the difference between cashaddr and tokenaddr?
- \`cashaddr\`: Standard BCH address (bitcoincash:q...)
- \`tokenaddr\`: Token-aware address (bitcoincash:z...)
Use tokenaddr when receiving CashTokens.

### How do I get testnet coins?
Use the \`get_testnet_satoshis\` tool with your testnet walletId.

## Wallets

### What is a walletId?
A string that contains all info to restore a wallet:
- \`wif:testnet:cNfsP...\` - Private key format
- \`seed:testnet:word1 word2...:path\` - Seed phrase format

### Can I use the same wallet on mainnet and testnet?
No, wallets are network-specific. Create separate wallets for each network.

### What's a watch-only wallet?
A wallet that can view balance and history but cannot spend. Created from a public address.

## Transactions

### What are the fees?
~1 satoshi per byte. Average transaction is ~250 bytes = ~250 sats (~$0.001).

### What is OP_RETURN?
A way to store data on the blockchain. Limited to 220 bytes. Used by protocols like MEMO.

### How long until my transaction confirms?
Usually in the next block (~10 minutes). 0-conf is safe for small amounts.

## CashTokens

### What's the difference between FT and NFT?
- **FT (Fungible)**: Identical, divisible tokens (like ERC-20)
- **NFT (Non-Fungible)**: Unique tokens with commitment data

### What are capabilities?
NFT permissions:
- \`none\`: Immutable, cannot mint more
- \`mutable\`: Can change commitment
- \`minting\`: Can create new NFTs

### Can tokens be burned accidentally?
No, CashTokens are designed to be safe. Tokens cannot be burned by wallets unaware of them.

## Escrow

### What if the arbiter is unresponsive?
Design your escrow with trusted arbiters. Consider multi-sig alternatives for trustless setups.

### What's the minimum escrow amount?
~3700 satoshis due to contract size. Add ~1000 sats buffer for fees.`,

	developerResources: `# Developer Resources

## Official Tools
- **mainnet-js**: https://mainnet.cash - JavaScript library
- **CashScript**: https://cashscript.org - Smart contract language
- **Libauth**: https://libauth.org - Low-level crypto library

## Block Explorers
- **Mainnet**: https://blockchair.com/bitcoin-cash
- **Mainnet**: https://explorer.bitcoin.com/bch
- **Testnet**: https://chipnet.imaginary.cash

## Faucets
- **Testnet Faucet**: Use \`get_testnet_satoshis\` tool
- **Testnet Faucet**: https://faucet.fullstack.cash

## Infrastructure
- **Fulcrum**: ElectrumX-compatible indexer
- **BCHN**: Full node implementation
- **Fountainhead**: https://fountainhead.cash - APIs and services

## APIs & Services
- **REST API**: https://rest-unstable.mainnet.cash
- **Insomnia**: http://insomnia.fountainhead.cash - REST services
- **Full Stack**: https://fullstack.cash - API services

## Development Tools
- **CashScript Playground**: https://playground.cashscript.org
- **Bitbox SDK**: Alternative JavaScript library
- **Electron Cash**: Testnet wallet

## Community
- **Telegram**: t.me/baboross (mainnet.cash)
- **Bitcoin Cash Research**: https://bitcoincashresearch.org
- **Reddit**: r/btc, r/bitcoincash

## Documentation
- **CHIP Process**: https://gitlab.com/im_uname/cash-improvement-proposals
- **Protocol Spec**: https://reference.cash
- **Electrum Protocol**: https://electrum-cash-protocol.readthedocs.io`,

	security: `# Security Best Practices

## Wallet Security

### Seed Phrases
- Write down on paper, never digitally
- Store in multiple secure locations
- Never share with anyone
- Use 24 words for maximum security

### Private Keys (WIF)
- Never expose in logs or errors
- Never commit to version control
- Use environment variables
- Rotate if potentially compromised

### WalletIds
- Contain private key data
- Treat as sensitive
- Don't store in plain text databases
- Encrypt at rest

## Transaction Security

### Address Verification
- Always validate addresses before sending
- Use \`validate_address\` tool
- Double-check network (mainnet vs testnet)
- Verify checksums

### Amount Verification
- Double-check amounts and units
- Be careful with decimal places
- 1 BCH = 100,000,000 satoshis

### Test First
- Always test on testnet first
- Start with small amounts on mainnet
- Verify transaction before broadcast

## API Security

### Rate Limiting
- Implement rate limiting
- Monitor for abuse
- Use proper error handling

### Input Validation
- Validate all inputs
- Sanitize addresses
- Check amount bounds

### HTTPS
- Always use HTTPS in production
- Verify SSL certificates
- Use secure headers

## Common Attacks

### Phishing
- Verify addresses carefully
- Don't trust unsolicited messages
- Check URLs thoroughly

### Dust Attacks
- Small UTXOs sent to track addresses
- Don't consolidate without caution
- Use coin control

### Replay Attacks
- BCH has replay protection from BTC
- Still verify transaction hashes

## Recovery

### Lost Seed Phrase
- Funds are permanently lost
- No recovery possible
- Always backup before funding

### Transaction Errors
- BCH transactions are irreversible
- Double-check before broadcasting
- Use encode_transaction to review first`,

	// CashScript Documentation
	cashscriptAbout: `# What is CashScript?

CashScript is a high-level programming language for smart contracts on Bitcoin Cash. It offers a strong abstraction layer over Bitcoin Cash's native virtual machine, BCH Script.

## Key Features
- **Solidity-like Syntax**: Familiar to Ethereum developers
- **TypeScript SDK**: Full support for creating and testing contracts
- **Native Introspection**: Access transaction data within contracts
- **CashTokens Support**: Full fungible and NFT token support
- **Covenant Support**: Restrict how money can be spent

## Quick Start
1. Install compiler: \`npm install -g cashc\`
2. Write a .cash contract
3. Compile: \`cashc contract.cash --output contract.json\`
4. Use SDK to interact: \`npm install cashscript\`

## Playground
Try CashScript online: https://playground.cashscript.org/

## Resources
- Documentation: https://cashscript.org
- GitHub: https://github.com/CashScript/cashscript
- Examples: https://github.com/CashScript/cashscript/tree/master/examples`,

	cashscriptLanguage: `# CashScript Language Reference

## Contract Structure
\`\`\`solidity
pragma cashscript ^0.12.0;

contract ContractName(
    // Constructor arguments (stored in contract bytecode)
    pubkey owner,
    int amount,
    bytes32 hash
) {
    // Contract functions
    function functionName(sig signature) {
        require(checkSig(signature, owner));
    }
}
\`\`\`

## Data Types

### Primitives
- \`bool\`: true/false
- \`int\`: Signed integer (BigInt)
- \`string\`: UTF-8 encoded bytes
- \`bytes\`: Byte sequence (bytes4, bytes20, bytes32, etc.)

### Special Types
- \`pubkey\`: Public key (33 bytes)
- \`sig\`: Transaction signature (65 bytes)
- \`datasig\`: Data signature (64 bytes)

## Operators
| Type | Operators |
|------|-----------|
| Comparison | \`<\`, \`>\`, \`<=\`, \`>=\`, \`==\`, \`!=\` |
| Arithmetic | \`+\`, \`-\`, \`*\`, \`/\`, \`%\` |
| Logical | \`!\`, \`&&\`, \`||\` |
| Bitwise | \`&\`, \`|\`, \`^\` |
| Concatenation | \`+\` (for strings/bytes) |

## Statements
- \`require(condition)\`: Assert condition is true
- \`require(condition, "error message")\`: With debug message
- Variable declaration: \`int x = 5;\`
- Control: \`if (condition) { } else { }\`
- Logging: \`console.log("value:", x)\` (debug only)

## Global Functions
- \`checkSig(sig, pubkey)\`: Verify signature
- \`checkMultiSig([sigs], [pubkeys])\`: Multi-signature
- \`sha256(bytes)\`, \`hash256(bytes)\`: SHA-256 hashing
- \`ripemd160(bytes)\`, \`hash160(bytes)\`: RIPEMD-160 hashing
- \`abs(int)\`, \`min(int, int)\`, \`max(int, int)\`: Math`,

	cashscriptGlobals: `# CashScript Global Variables

## Time Locks

### tx.time
Absolute time lock (block height or timestamp).
\`\`\`solidity
require(tx.time >= 800000);  // Block height
require(tx.time >= 1700000000);  // Unix timestamp
\`\`\`

### this.age
Relative time lock (blocks since UTXO creation).
\`\`\`solidity
require(this.age >= 144);  // ~1 day (144 blocks)
\`\`\`

## Transaction Introspection

### Current Input
- \`this.activeInputIndex\`: Index of current input
- \`this.activeBytecode\`: Contract bytecode

### Transaction Info
- \`tx.version\`: Transaction version (1 or 2)
- \`tx.locktime\`: nLocktime value
- \`tx.inputs.length\`: Number of inputs
- \`tx.outputs.length\`: Number of outputs

### Input Fields (tx.inputs[i].*)
| Field | Type | Description |
|-------|------|-------------|
| \`value\` | int | Satoshi value |
| \`lockingBytecode\` | bytes | scriptPubKey |
| \`unlockingBytecode\` | bytes | scriptSig |
| \`outpointTransactionHash\` | bytes32 | TXID |
| \`outpointIndex\` | int | Output index |
| \`sequenceNumber\` | int | nSequence |
| \`tokenCategory\` | bytes | Token category + capability |
| \`nftCommitment\` | bytes | NFT commitment data |
| \`tokenAmount\` | int | Fungible token amount |

### Output Fields (tx.outputs[i].*)
| Field | Type | Description |
|-------|------|-------------|
| \`value\` | int | Satoshi value |
| \`lockingBytecode\` | bytes | scriptPubKey |
| \`tokenCategory\` | bytes | Token category + capability |
| \`nftCommitment\` | bytes | NFT commitment data |
| \`tokenAmount\` | int | Fungible token amount |

## Locking Bytecode Constructors
\`\`\`solidity
// P2PKH (regular address)
bytes25 lock = new LockingBytecodeP2PKH(bytes20 pkh);

// P2SH (script hash)
bytes35 lock = new LockingBytecodeP2SH32(bytes32 scriptHash);

// OP_RETURN (data storage)
bytes lock = new LockingBytecodeNullData(["data1", "data2"]);
\`\`\`

## Units
\`\`\`solidity
// BCH amounts
require(1 sats == 1);
require(1 bits == 100);
require(1 bitcoin == 1e8);

// Time units
require(1 minutes == 60 seconds);
require(1 hours == 60 minutes);
require(1 days == 24 hours);
require(1 weeks == 7 days);
\`\`\``,

	cashscriptCovenants: `# CashScript Covenants

A covenant is a constraint on how money can be spent. Covenants use transaction introspection to restrict where funds can go.

## Basic Covenant Pattern
\`\`\`solidity
contract RestrictedSpend(bytes20 allowedRecipient) {
    function spend(pubkey pk, sig s) {
        require(checkSig(s, pk));
        
        // Restrict where funds can go
        bytes25 recipientLock = new LockingBytecodeP2PKH(allowedRecipient);
        require(tx.outputs[0].lockingBytecode == recipientLock);
    }
}
\`\`\`

## Escrow Contract
\`\`\`solidity
contract Escrow(bytes20 arbiter, bytes20 buyer, bytes20 seller) {
    function spend(pubkey pk, sig s) {
        require(hash160(pk) == arbiter);
        require(checkSig(s, pk));

        int minerFee = 1000;
        int amount = tx.inputs[this.activeInputIndex].value - minerFee;
        require(tx.outputs[0].value == amount);

        bytes25 buyerLock = new LockingBytecodeP2PKH(buyer);
        bytes25 sellerLock = new LockingBytecodeP2PKH(seller);
        bool sendsToBuyer = tx.outputs[0].lockingBytecode == buyerLock;
        bool sendsToSeller = tx.outputs[0].lockingBytecode == sellerLock;
        require(sendsToBuyer || sendsToSeller);
    }
}
\`\`\`

## Self-Spending (Refresh Pattern)
\`\`\`solidity
contract LastWill(bytes20 inheritor, bytes20 owner) {
    function inherit(pubkey pk, sig s) {
        require(this.age >= 180 days);
        require(hash160(pk) == inheritor);
        require(checkSig(s, pk));
    }

    function refresh(pubkey pk, sig s) {
        require(hash160(pk) == owner);
        require(checkSig(s, pk));

        // Send back to same contract
        bytes contractLock = tx.inputs[this.activeInputIndex].lockingBytecode;
        require(tx.outputs[0].lockingBytecode == contractLock);
    }
}
\`\`\`

## Local State with NFTs
Use NFT commitment to store mutable state:
\`\`\`solidity
contract StatefulContract() {
    function updateState() {
        // Read current state from NFT commitment
        bytes state = tx.inputs[0].nftCommitment;
        int counter = int(state);
        
        // Update state in output
        bytes newState = bytes8(counter + 1);
        require(tx.outputs[0].nftCommitment == newState);
    }
}
\`\`\`

## Key Patterns
1. **Restrict Recipients**: Check output lockingBytecode
2. **Restrict Amounts**: Check output value
3. **Self-Spending**: Send back to same contract
4. **Time Locks**: Use tx.time or this.age
5. **State Storage**: Use NFT commitments`,

	cashscriptSdk: `# CashScript TypeScript SDK

## Installation
\`\`\`bash
npm install cashscript
\`\`\`

## Contract Initialization
\`\`\`typescript
import { ElectrumNetworkProvider, Contract } from 'cashscript';
import artifact from './contract.json' with { type: 'json' };

const provider = new ElectrumNetworkProvider('chipnet');
const contract = new Contract(artifact, [arg1, arg2], { provider });

console.log("Address:", contract.address);
console.log("Balance:", await contract.getBalance());
console.log("UTXOs:", await contract.getUtxos());
\`\`\`

## TransactionBuilder
\`\`\`typescript
import { TransactionBuilder, SignatureTemplate } from 'cashscript';

const template = new SignatureTemplate(privateKey);
const utxos = await contract.getUtxos();

const tx = await new TransactionBuilder({ provider })
  .addInput(utxos[0], contract.unlock.functionName(template))
  .addOutput({
    to: recipientAddress,
    amount: 10000n
  })
  .send();

console.log("TXID:", tx.txid);
\`\`\`

## Adding Inputs
\`\`\`typescript
// Contract input
builder.addInput(utxo, contract.unlock.spend(sigTemplate));

// P2PKH input
builder.addInput(utxo, template.unlockP2PKH());

// Multiple inputs
builder.addInputs(utxos, contract.unlock.spend(sigTemplate));
\`\`\`

## Adding Outputs
\`\`\`typescript
// BCH output
builder.addOutput({ to: address, amount: 10000n });

// Token output
builder.addOutput({
  to: address,
  amount: 1000n,
  token: {
    amount: 100n,
    category: tokenId,
    nft: { capability: 'none', commitment: '01' }
  }
});

// OP_RETURN
builder.addOpReturnOutput(['0x6d02', 'Hello']);
\`\`\`

## Time Locks
\`\`\`typescript
builder.setLocktime(blockHeight);
builder.addInput(utxo, unlocker, { sequence: blocks });
\`\`\`

## Debugging
\`\`\`typescript
// Debug locally
const result = builder.debug();
console.log(result);

// Get BitAuth IDE URI
const uri = builder.getBitauthUri();
\`\`\`

## Network Providers
- \`ElectrumNetworkProvider\`: Production (mainnet/chipnet)
- \`MockNetworkProvider\`: Testing with simulated UTXOs

## SignatureTemplate
\`\`\`typescript
const template = new SignatureTemplate(
  privateKey,
  HashType.SIGHASH_ALL // default
);
\`\`\``
};



export default function createServer({
	config,
}: {
	config: z.infer<typeof configSchema>
}) {
	const server = new McpServer({
		name: "Mainnet-JS BCH MCP Server",
		version: "1.0.0",
	})

	// --- Register Documentation Resources ---

	server.resource(
		"bch-overview",
		"docs://overview",
		{ description: "Overview of the BCH MCP Server and its capabilities", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://overview", text: DOCS.overview, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"wallet-guide",
		"docs://wallets",
		{ description: "Guide for creating and managing BCH wallets", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://wallets", text: DOCS.wallets, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"transaction-guide",
		"docs://transactions",
		{ description: "Guide for sending BCH and building transactions", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://transactions", text: DOCS.transactions, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"cashtokens-guide",
		"docs://cashtokens",
		{ description: "Guide for creating and managing CashTokens (fungible and NFT)", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://cashtokens", text: DOCS.cashtokens, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"escrow-guide",
		"docs://escrow",
		{ description: "Guide for creating and using escrow smart contracts", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://escrow", text: DOCS.escrow, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"utilities-guide",
		"docs://utilities",
		{ description: "Guide for utility tools like QR codes, price conversion, and more", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://utilities", text: DOCS.utilities, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"bch-basics",
		"docs://bch-basics",
		{ description: "Bitcoin Cash fundamentals - units, transactions, confirmations", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://bch-basics", text: DOCS.bchBasics, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"addresses-guide",
		"docs://addresses",
		{ description: "Bitcoin Cash address formats - CashAddr, token addresses, legacy", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://addresses", text: DOCS.addresses, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"smart-contracts",
		"docs://smart-contracts",
		{ description: "CashScript smart contracts guide - escrow, multisig, covenants", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://smart-contracts", text: DOCS.smartContracts, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"bcmr-guide",
		"docs://bcmr",
		{ description: "BCMR - Bitcoin Cash Metadata Registries for token metadata", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://bcmr", text: DOCS.bcmr, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"network-info",
		"docs://network",
		{ description: "Bitcoin Cash network information - mainnet, testnet, nodes", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://network", text: DOCS.network, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"api-reference",
		"docs://api-reference",
		{ description: "Complete API reference for all available tools", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://api-reference", text: DOCS.apiReference, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"code-examples",
		"docs://examples",
		{ description: "Code examples for common BCH operations", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://examples", text: DOCS.examples, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"faq",
		"docs://faq",
		{ description: "Frequently asked questions about BCH and this MCP server", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://faq", text: DOCS.faq, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"developer-resources",
		"docs://developer-resources",
		{ description: "Developer tools, APIs, block explorers, and community resources", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://developer-resources", text: DOCS.developerResources, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"security-guide",
		"docs://security",
		{ description: "Security best practices for wallets, transactions, and API usage", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://security", text: DOCS.security, mimeType: "text/markdown" }]
		})
	)

	// --- CashScript Documentation Resources ---

	server.resource(
		"cashscript-about",
		"docs://cashscript",
		{ description: "What is CashScript - high-level smart contract language for BCH", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://cashscript", text: DOCS.cashscriptAbout, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"cashscript-language",
		"docs://cashscript-language",
		{ description: "CashScript language reference - types, operators, statements", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://cashscript-language", text: DOCS.cashscriptLanguage, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"cashscript-globals",
		"docs://cashscript-globals",
		{ description: "CashScript global variables - tx introspection, time locks, units", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://cashscript-globals", text: DOCS.cashscriptGlobals, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"cashscript-covenants",
		"docs://cashscript-covenants",
		{ description: "CashScript covenants guide - restrict spending, escrow, state", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://cashscript-covenants", text: DOCS.cashscriptCovenants, mimeType: "text/markdown" }]
		})
	)

	server.resource(
		"cashscript-sdk",
		"docs://cashscript-sdk",
		{ description: "CashScript TypeScript SDK - Contract, TransactionBuilder, debugging", mimeType: "text/markdown" },
		async () => ({
			contents: [{ uri: "docs://cashscript-sdk", text: DOCS.cashscriptSdk, mimeType: "text/markdown" }]
		})
	)

	// --- Wallet Management ---

	server.registerTool(
		"wallet_create",
		{
			title: "Create Wallet",
			description: "Create a new random wallet",
			inputSchema: z.object({
				network: z.enum(["mainnet", "testnet", "regtest"]).default("testnet").describe("BTC network"),
				type: z.enum(["seed", "wif"]).default("seed").describe("Wallet type"),
				name: z.string().optional().describe("Optional name for persistent wallet"),
			}),
		},
		async ({ network, type, name }) => {
			let wallet;
			if (name) {
				// Note: persistence requires a StorageProvider configured globally if used in Node.
				// For this MCP, we focus on walletIds.
			}
			if (network === "mainnet") {
				wallet = await Wallet.newRandom();
			} else {
				wallet = await TestNetWallet.newRandom();
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							cashaddr: wallet.cashaddr,
							tokenaddr: wallet.tokenaddr,
							walletId: wallet.toString(),
							mnemonic: wallet.mnemonic,
							derivationPath: wallet.derivationPath,
							privateKeyWif: (wallet as any).privateKeyWif,
							network: network
						}, null, 2),
					},
				],
			}
		}
	)

	server.registerTool(
		"wallet_from_id",
		{
			title: "Wallet Info from ID",
			description: "Get wallet details from a walletId",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId (e.g., 'wif:testnet:...')"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							cashaddr: wallet.cashaddr,
							tokenaddr: wallet.tokenaddr,
							walletId: wallet.toString(),
							network: wallet.network,
						}, null, 2),
					},
				],
			}
		}
	)

	// --- Balance ---

	server.registerTool(
		"get_balance",
		{
			title: "Get Balance",
			description: "Get the BCH balance of a wallet",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for balance"),
			}),
		},
		async ({ walletId, unit }) => {
			const wallet = await walletFromId(walletId);
			const balance = await wallet.getBalance(unit as UnitEnum);
			return {
				content: [
					{
						type: "text",
						text: typeof balance === 'object'
							? JSON.stringify(balance, null, 2)
							: `${balance} ${unit}`,
					},
				],
			}
		}
	)

	// --- Sending ---

	server.registerTool(
		"send",
		{
			title: "Send BCH",
			description: "Send BCH to an address",
			inputSchema: z.object({
				walletId: z.string().describe("The source walletId"),
				to: z.array(z.object({
					cashaddr: z.string().describe("Recipient address"),
					value: z.number().describe("Amount to send"),
					unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for amount"),
				})).describe("List of recipients"),
			}),
		},
		async ({ walletId, to }) => {
			const wallet = await walletFromId(walletId);
			const requests = to.map(r => ({
				cashaddr: r.cashaddr,
				value: r.value,
				unit: r.unit as UnitEnum
			}));
			const response = await wallet.send(requests);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	server.registerTool(
		"send_max",
		{
			title: "Send Max",
			description: "Send all available funds to an address",
			inputSchema: z.object({
				walletId: z.string().describe("The source walletId"),
				address: z.string().describe("Recipient address"),
			}),
		},
		async ({ walletId, address }) => {
			const wallet = await walletFromId(walletId);
			const response = await wallet.sendMax(address);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	server.registerTool(
		"op_return_send",
		{
			title: "Send OP_RETURN",
			description: "Send a transaction with OP_RETURN data",
			inputSchema: z.object({
				walletId: z.string().describe("The source walletId"),
				data: z.array(z.string()).describe("List of strings to push to OP_RETURN"),
			}),
		},
		async ({ walletId, data }) => {
			const wallet = await walletFromId(walletId);
			const response = await wallet.send([
				(OpReturnData as any).fromArray(data)
			]);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	// --- History ---

	server.registerTool(
		"get_history",
		{
			title: "Get History",
			description: "Get transaction history for a wallet",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for amounts in history"),
				start: z.number().default(0).describe("Starting index (reverse chronological)"),
				count: z.number().default(10).describe("Number of transactions to return"),
			}),
		},
		async ({ walletId, unit, start, count }) => {
			const wallet = await walletFromId(walletId);
			const history = await wallet.getHistory(unit as UnitEnum, start, count);
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(history), null, 2) }],
			}
		}
	)

	// --- Signing & Verification ---

	server.registerTool(
		"sign_message",
		{
			title: "Sign Message",
			description: "Sign a message with the wallet's private key",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				message: z.string().describe("The message to sign"),
			}),
		},
		async ({ walletId, message }) => {
			const wallet = await walletFromId(walletId);
			const sigResult = await wallet.sign(message);
			return {
				content: [{ type: "text", text: JSON.stringify(sigResult, null, 2) }],
			}
		}
	)

	server.registerTool(
		"verify_message",
		{
			title: "Verify Message",
			description: "Verify a message signature",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId (can be watch-only)"),
				message: z.string().describe("The original message"),
				signature: z.string().describe("The signature to verify"),
			}),
		},
		async ({ walletId, message, signature }) => {
			const wallet = await walletFromId(walletId);
			const verifyResult = await wallet.verify(message, signature);
			return {
				content: [{ type: "text", text: JSON.stringify(verifyResult, null, 2) }],
			}
		}
	)

	// --- Waiting ---

	server.registerTool(
		"wait_for_transaction",
		{
			title: "Wait for Transaction",
			description: "Halt until a transaction is received",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			const response = await wallet.waitForTransaction();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	server.registerTool(
		"wait_for_balance",
		{
			title: "Wait for Balance",
			description: "Halt until the wallet reaches a certain balance",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				value: z.number().describe("Target balance"),
				unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for target balance"),
			}),
		},
		async ({ walletId, value, unit }) => {
			const wallet = await walletFromId(walletId);
			const response = await wallet.waitForBalance(value, unit as UnitEnum);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	// --- Faucet ---

	server.registerTool(
		"get_testnet_satoshis",
		{
			title: "Get Testnet Satoshis",
			description: "Request free testnet satoshis from the faucet",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId to receive sats"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			if (wallet.network !== "testnet") {
				return {
					content: [{ type: "text", text: "Faucet only works on testnet" }]
				};
			}
			const response = await fetch("https://rest-unstable.mainnet.cash/faucet/get_testnet_bch", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ cashaddr: wallet.cashaddr })
			});
			const result = await response.json() as { txId?: string, error?: string };
			if (result.error) {
				return {
					content: [{ type: "text", text: `Faucet error: ${result.error}` }]
				};
			}
			return {
				content: [
					{
						type: "text",
						text: `Success! Transaction ID: ${result.txId}`,
					},
				],
			}
		}
	)

	// --- CashTokens ---

	server.registerTool(
		"token_genesis",
		{
			title: "Token Genesis",
			description: "Create a new token category",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId to perform genesis"),
				amount: z.string().describe("Fungible token amount (as string)"),
				commitment: z.string().optional().describe("NFT commitment (hex string)"),
				capability: z.enum(["none", "mutable", "minting"]).default("none").describe("NFT capability"),
				cashaddr: z.string().optional().describe("Recipient address for tokens"),
			}),
		},
		async ({ walletId, amount, commitment, capability, cashaddr }) => {
			const wallet = await walletFromId(walletId);
			const capMap = {
				"none": NFTCapability.none,
				"mutable": NFTCapability.mutable,
				"minting": NFTCapability.minting
			};

			const response = await wallet.tokenGenesis({
				amount: BigInt(amount),
				commitment: commitment,
				capability: capMap[capability],
				cashaddr: cashaddr || wallet.cashaddr
			});
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	server.registerTool(
		"token_send",
		{
			title: "Token Send",
			description: "Send tokens to an address",
			inputSchema: z.object({
				walletId: z.string().describe("The source walletId"),
				tokenId: z.string().describe("Category ID of the token"),
				amount: z.string().describe("Fungible token amount (as string)"),
				cashaddr: z.string().describe("Recipient address"),
				commitment: z.string().optional().describe("NFT commitment (hex string)"),
				capability: z.enum(["none", "mutable", "minting"]).optional().describe("NFT capability"),
			}),
		},
		async ({ walletId, tokenId, amount, cashaddr, commitment, capability }) => {
			const wallet = await walletFromId(walletId);
			const capMap = capability ? {
				"none": NFTCapability.none,
				"mutable": NFTCapability.mutable,
				"minting": NFTCapability.minting
			}[capability] : undefined;

			const response = await wallet.send([
				new TokenSendRequest({
					cashaddr: cashaddr,
					amount: BigInt(amount),
					tokenId: tokenId,
					commitment: commitment,
					capability: capMap
				})
			]);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	server.registerTool(
		"token_mint",
		{
			title: "Token Mint",
			description: "Mint new NFT tokens",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId to perform minting"),
				tokenId: z.string().describe("The token category ID"),
				requests: z.array(z.object({
					cashaddr: z.string().describe("Recipient address"),
					commitment: z.string().describe("NFT commitment (hex string)"),
					capability: z.enum(["none", "mutable", "minting"]).default("none").describe("NFT capability"),
					value: z.number().optional().describe("Satoshi value for the output"),
				})),
				deductTokenAmount: z.boolean().default(true).describe("Whether to reduce the FT amount of the minting token"),
			}),
		},
		async ({ walletId, tokenId, requests, deductTokenAmount }) => {
			const wallet = await walletFromId(walletId);
			const capMap = {
				"none": NFTCapability.none,
				"mutable": NFTCapability.mutable,
				"minting": NFTCapability.minting
			};

			const mintRequests = requests.map(r => new TokenMintRequest({
				cashaddr: r.cashaddr,
				commitment: r.commitment,
				capability: capMap[r.capability],
				value: r.value
			}));

			const response = await wallet.tokenMint(tokenId, mintRequests, deductTokenAmount);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	server.registerTool(
		"token_burn",
		{
			title: "Token Burn",
			description: "Burn CashTokens",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				tokenId: z.string().describe("Token category ID"),
				amount: z.string().describe("Fungible token amount to burn"),
				capability: z.enum(["none", "mutable", "minting"]).optional().describe("NFT capability to burn"),
				commitment: z.string().optional().describe("NFT commitment to burn"),
				message: z.string().optional().describe("Optional OP_RETURN message"),
			}),
		},
		async ({ walletId, tokenId, amount, capability, commitment, message }) => {
			const wallet = await walletFromId(walletId);
			const capMap = capability ? {
				"none": NFTCapability.none,
				"mutable": NFTCapability.mutable,
				"minting": NFTCapability.minting
			}[capability] : undefined;

			const response = await wallet.tokenBurn(
				{
					tokenId: tokenId,
					amount: BigInt(amount),
					capability: capMap,
					commitment: commitment
				},
				message
			);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(serialize(response), null, 2),
					},
				],
			}
		}
	)

	server.registerTool(
		"get_token_balance",
		{
			title: "Get Token Balance",
			description: "Get the fungible token balance of a specific category",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				tokenId: z.string().describe("Token category ID"),
			}),
		},
		async ({ walletId, tokenId }) => {
			const wallet = await walletFromId(walletId);
			const balance = await wallet.getTokenBalance(tokenId);
			return {
				content: [{ type: "text", text: balance.toString() }],
			}
		}
	)

	server.registerTool(
		"get_nft_token_balance",
		{
			title: "Get NFT Token Balance",
			description: "Get the count of NFT tokens of a specific category",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				tokenId: z.string().describe("Token category ID"),
			}),
		},
		async ({ walletId, tokenId }) => {
			const wallet = await walletFromId(walletId);
			const balance = await wallet.getNftTokenBalance(tokenId);
			return {
				content: [{ type: "text", text: balance.toString() }],
			}
		}
	)

	server.registerTool(
		"get_all_token_balances",
		{
			title: "Get All Token Balances",
			description: "Get all fungible token balances",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			const balances = await wallet.getAllTokenBalances();
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(balances), null, 2) }],
			}
		}
	)

	server.registerTool(
		"get_all_nft_token_balances",
		{
			title: "Get All NFT Token Balances",
			description: "Get all NFT token balances",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			const balances = await wallet.getAllNftTokenBalances();
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(balances), null, 2) }],
			}
		}
	)

	server.registerTool(
		"get_token_utxos",
		{
			title: "Get Token UTXOs",
			description: "Get all UTXOs containing tokens",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				tokenId: z.string().optional().describe("Filter by tokenId"),
			}),
		},
		async ({ walletId, tokenId }) => {
			const wallet = await walletFromId(walletId);
			const utxos = await wallet.getTokenUtxos(tokenId);
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(utxos), null, 2) }],
			}
		}
	)

	// --- Escrow ---

	server.registerTool(
		"escrow_create",
		{
			title: "Create Escrow Contract",
			description: "Create a new escrow contract",
			inputSchema: z.object({
				arbiterAddr: z.string().describe("Arbiter cash address"),
				buyerAddr: z.string().describe("Buyer cash address"),
				sellerAddr: z.string().describe("Seller cash address"),
				amount: z.string().describe("Amount in satoshis"),
				network: z.enum(["mainnet", "testnet", "regtest"]).default("testnet").describe("Network"),
			}),
		},
		async ({ arbiterAddr, buyerAddr, sellerAddr, amount, network }) => {
			const escrow = new EscrowContract({
				arbiterAddr,
				buyerAddr,
				sellerAddr,
				amount: (BigInt(amount) as any)
			});
			return {
				content: [{
					type: "text", text: JSON.stringify({
						address: escrow.getDepositAddress(),
						contractId: escrow.toString(),
					}, null, 2)
				}],
			}
		}
	)

	// --- Utilities ---

	server.registerTool(
		"convert_currency",
		{
			title: "Convert Currency",
			description: "Convert between BCH, SAT, and USD",
			inputSchema: z.object({
				amount: z.number().describe("Amount to convert"),
				from: z.string().describe("Source unit"),
				to: z.string().describe("Target unit"),
			}),
		},
		async ({ amount, from, to }) => {
			const result = await convert(amount, from, to);
			return {
				content: [{ type: "text", text: result.toString() }],
			}
		}
	)

	server.registerTool(
		"qr_address",
		{
			title: "QR Code for Address",
			description: "Generate a QR code SVG data URI for a BCH address",
			inputSchema: z.object({
				address: z.string().describe("BCH address"),
				size: z.number().default(256).describe("Size of the QR code"),
			}),
		},
		async ({ address, size }) => {
			const svg = new QRCode({
				content: address,
				width: size,
				height: size,
			}).svg();
			const svgB64 = Buffer.from(svg).toString('base64');
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						src: `data:image/svg+xml;base64,${svgB64}`,
						title: address,
						alt: "a Bitcoin Cash address QR Code",
					}, null, 2)
				}],
			}
		}
	)

	server.registerTool(
		"decode_transaction",
		{
			title: "Decode Transaction",
			description: "Decode a transaction hex or search by hash",
			inputSchema: z.object({
				transaction: z.string().describe("Transaction hex or hash"),
				loadInputValues: z.boolean().default(true).describe("Whether to load input values from the blockchain"),
			}),
		},
		async ({ transaction, loadInputValues }) => {
			const decoded = await (Wallet as any).util.decodeTransaction(transaction, loadInputValues);
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(decoded), null, 2) }],
			}
		}
	)

	// --- Additional Wallet Tools ---

	server.registerTool(
		"wallet_from_seed",
		{
			title: "Wallet from Seed Phrase",
			description: "Restore a wallet from a mnemonic seed phrase",
			inputSchema: z.object({
				seedPhrase: z.string().describe("12 or 24 word mnemonic seed phrase"),
				derivationPath: z.string().default("m/44'/0'/0'/0/0").describe("BIP44 derivation path"),
				network: z.enum(["mainnet", "testnet"]).default("testnet").describe("Network"),
			}),
		},
		async ({ seedPhrase, derivationPath, network }) => {
			let wallet;
			if (network === "mainnet") {
				wallet = await Wallet.fromSeed(seedPhrase, derivationPath);
			} else {
				wallet = await TestNetWallet.fromSeed(seedPhrase, derivationPath);
			}
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						cashaddr: wallet.cashaddr,
						tokenaddr: wallet.tokenaddr,
						walletId: wallet.toString(),
						derivationPath: wallet.derivationPath,
						network: network
					}, null, 2)
				}],
			}
		}
	)

	server.registerTool(
		"wallet_from_wif",
		{
			title: "Wallet from WIF",
			description: "Restore a wallet from a WIF (Wallet Import Format) private key",
			inputSchema: z.object({
				wif: z.string().describe("WIF private key"),
				network: z.enum(["mainnet", "testnet"]).default("testnet").describe("Network"),
			}),
		},
		async ({ wif, network }) => {
			let wallet;
			if (network === "mainnet") {
				wallet = await Wallet.fromWIF(wif);
			} else {
				wallet = await TestNetWallet.fromWIF(wif);
			}
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						cashaddr: wallet.cashaddr,
						tokenaddr: wallet.tokenaddr,
						walletId: wallet.toString(),
						network: network
					}, null, 2)
				}],
			}
		}
	)

	server.registerTool(
		"wallet_watch_only",
		{
			title: "Create Watch-Only Wallet",
			description: "Create a watch-only wallet from a cash address (can view but not spend)",
			inputSchema: z.object({
				cashaddr: z.string().describe("Cash address to watch"),
				network: z.enum(["mainnet", "testnet"]).default("testnet").describe("Network"),
			}),
		},
		async ({ cashaddr, network }) => {
			let wallet;
			if (network === "mainnet") {
				wallet = await Wallet.watchOnly(cashaddr);
			} else {
				wallet = await TestNetWallet.watchOnly(cashaddr);
			}
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						cashaddr: wallet.cashaddr,
						tokenaddr: wallet.tokenaddr,
						walletId: wallet.toString(),
						network: network,
						isWatchOnly: true
					}, null, 2)
				}],
			}
		}
	)

	// --- UTXO Management ---

	server.registerTool(
		"get_utxos",
		{
			title: "Get UTXOs",
			description: "Get all unspent transaction outputs for a wallet",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			const utxos = await wallet.getUtxos();
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(utxos), null, 2) }],
			}
		}
	)

	server.registerTool(
		"get_max_amount_to_send",
		{
			title: "Get Max Amount to Send",
			description: "Get the maximum amount that can be sent (balance minus fees)",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
				outputCount: z.number().default(1).describe("Number of outputs in the transaction"),
			}),
		},
		async ({ walletId, outputCount }) => {
			const wallet = await walletFromId(walletId);
			const maxAmount = await wallet.getMaxAmountToSend({ outputCount });
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(maxAmount), null, 2) }],
			}
		}
	)

	// --- History & Blockchain Info ---

	server.registerTool(
		"get_raw_history",
		{
			title: "Get Raw Transaction History",
			description: "Get raw transaction history for a wallet (chronological order)",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			const history = await wallet.getRawHistory();
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(history), null, 2) }],
			}
		}
	)

	server.registerTool(
		"get_block_height",
		{
			title: "Get Block Height",
			description: "Get the current blockchain block height",
			inputSchema: z.object({
				network: z.enum(["mainnet", "testnet"]).default("testnet").describe("Network"),
			}),
		},
		async ({ network }) => {
			let wallet;
			if (network === "mainnet") {
				wallet = await Wallet.newRandom();
			} else {
				wallet = await TestNetWallet.newRandom();
			}
			const height = await wallet.provider!.getBlockHeight();
			return {
				content: [{ type: "text", text: JSON.stringify({ blockHeight: height, network }, null, 2) }],
			}
		}
	)

	// --- Price & Conversion ---

	server.registerTool(
		"get_bch_price",
		{
			title: "Get BCH Price",
			description: "Get the current BCH price in USD",
			inputSchema: z.object({}),
		},
		async () => {
			const priceInSat = await convert(1, "usd", "sat");
			const pricePerBch = await convert(1, "bch", "usd");
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						bchPriceUsd: pricePerBch,
						satoshisPerUsd: priceInSat,
						timestamp: new Date().toISOString()
					}, null, 2)
				}],
			}
		}
	)

	// --- Advanced Transaction Tools ---

	server.registerTool(
		"encode_transaction",
		{
			title: "Encode Transaction",
			description: "Build a transaction without broadcasting (returns hex)",
			inputSchema: z.object({
				walletId: z.string().describe("The source walletId"),
				to: z.array(z.object({
					cashaddr: z.string().describe("Recipient address"),
					value: z.number().describe("Amount to send"),
					unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for amount"),
				})).describe("List of recipients"),
			}),
		},
		async ({ walletId, to }) => {
			const wallet = await walletFromId(walletId);
			const requests = to.map(r => ({
				cashaddr: r.cashaddr,
				value: r.value,
				unit: r.unit as UnitEnum
			}));
			const encoded = await wallet.encodeTransaction(requests);
			return {
				content: [{ type: "text", text: JSON.stringify({ hex: encoded }, null, 2) }],
			}
		}
	)

	server.registerTool(
		"submit_transaction",
		{
			title: "Submit Transaction",
			description: "Broadcast a signed transaction hex to the network",
			inputSchema: z.object({
				walletId: z.string().describe("Any walletId (used for network connection)"),
				transactionHex: z.string().describe("Signed transaction in hex format"),
			}),
		},
		async ({ walletId, transactionHex }) => {
			const wallet = await walletFromId(walletId);
			const txId = await wallet.submitTransaction(transactionHex as any);
			return {
				content: [{ type: "text", text: JSON.stringify({ txId }, null, 2) }],
			}
		}
	)

	// --- Wallet Keys & Info ---

	server.registerTool(
		"get_public_key",
		{
			title: "Get Public Key",
			description: "Get the compressed public key and public key hash for a wallet",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			const publicKey = wallet.getPublicKey ? wallet.getPublicKey(true) : null;
			const publicKeyHash = wallet.getPublicKeyHash ? wallet.getPublicKeyHash(true) : null;
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						publicKey,
						publicKeyHash,
						cashaddr: wallet.cashaddr,
						tokenaddr: wallet.tokenaddr
					}, null, 2)
				}],
			}
		}
	)

	server.registerTool(
		"get_deposit_address",
		{
			title: "Get Deposit Address",
			description: "Get the deposit address for a wallet (both regular and token addresses)",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						cashaddr: wallet.cashaddr,
						tokenaddr: wallet.tokenaddr,
						network: wallet.network
					}, null, 2)
				}],
			}
		}
	)

	// --- Escrow Advanced ---

	server.registerTool(
		"escrow_get_balance",
		{
			title: "Get Escrow Balance",
			description: "Get the balance of an escrow contract",
			inputSchema: z.object({
				contractId: z.string().describe("The escrow contract ID"),
			}),
		},
		async ({ contractId }) => {
			const escrow = EscrowContract.fromId(contractId);
			const balance = await escrow.getBalance();
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						balance: balance,
						address: escrow.getDepositAddress()
					}, null, 2)
				}],
			}
		}
	)

	server.registerTool(
		"escrow_spend",
		{
			title: "Escrow Spend",
			description: "Release escrow funds to the seller (buyer or arbiter can call)",
			inputSchema: z.object({
				contractId: z.string().describe("The escrow contract ID"),
				wif: z.string().describe("Private key (WIF) of buyer or arbiter"),
			}),
		},
		async ({ contractId, wif }) => {
			const escrow = EscrowContract.fromId(contractId);
			const result = await escrow.call(wif, "spend");
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(result), null, 2) }],
			}
		}
	)

	server.registerTool(
		"escrow_refund",
		{
			title: "Escrow Refund",
			description: "Refund escrow funds to the buyer (seller or arbiter can call)",
			inputSchema: z.object({
				contractId: z.string().describe("The escrow contract ID"),
				wif: z.string().describe("Private key (WIF) of seller or arbiter"),
			}),
		},
		async ({ contractId, wif }) => {
			const escrow = EscrowContract.fromId(contractId);
			const result = await escrow.call(wif, "refund");
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(result), null, 2) }],
			}
		}
	)

	// --- Token Watching ---

	server.registerTool(
		"get_token_deposit_address",
		{
			title: "Get Token Deposit Address",
			description: "Get the token-aware deposit address for receiving CashTokens",
			inputSchema: z.object({
				walletId: z.string().describe("The walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						tokenaddr: wallet.tokenaddr,
						cashaddr: wallet.cashaddr,
						note: "Use tokenaddr for receiving CashTokens"
					}, null, 2)
				}],
			}
		}
	)

	// --- Testnet Utilities ---

	server.registerTool(
		"return_testnet_satoshis",
		{
			title: "Return Testnet Satoshis",
			description: "Return testnet satoshis back to the faucet",
			inputSchema: z.object({
				walletId: z.string().describe("The testnet walletId"),
			}),
		},
		async ({ walletId }) => {
			const wallet = await walletFromId(walletId);
			if (wallet.network !== "testnet") {
				return {
					content: [{ type: "text", text: "This function only works on testnet" }]
				};
			}
			// Send to the testnet faucet return address
			const result = await (wallet as any).returnTestnetSatoshis();
			return {
				content: [{ type: "text", text: JSON.stringify(serialize(result), null, 2) }],
			}
		}
	)

	// --- Address Validation ---

	server.registerTool(
		"validate_address",
		{
			title: "Validate Address",
			description: "Validate a Bitcoin Cash address and get its details",
			inputSchema: z.object({
				address: z.string().describe("The address to validate"),
			}),
		},
		async ({ address }) => {
			try {
				// Try to create a watch-only wallet to validate
				const wallet = await TestNetWallet.watchOnly(address);
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							valid: true,
							cashaddr: wallet.cashaddr,
							tokenaddr: wallet.tokenaddr,
							network: wallet.network
						}, null, 2)
					}],
				}
			} catch (error) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							valid: false,
							error: (error as Error).message
						}, null, 2)
					}],
				}
			}
		}
	)

	return server.server
}

