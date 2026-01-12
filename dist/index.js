// src/server.ts
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  Wallet,
  TestNetWallet,
  walletFromId,
  NFTCapability,
  TokenSendRequest,
  TokenMintRequest,
  OpReturnData,
  convert
} from "mainnet-js";
import { EscrowContract } from "@mainnet-cash/contract";
import QRCode from "qrcode-svg";
function serialize(obj) {
  if (obj === null || obj === void 0) return obj;
  return JSON.parse(JSON.stringify(
    obj,
    (key, value) => typeof value === "bigint" ? value.toString() : value
  ));
}
var configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging")
});
function createServer({
  config: config2
}) {
  const server = new McpServer({
    name: "Mainnet-JS BCH MCP Server",
    version: "1.0.0"
  });
  server.registerTool(
    "wallet_create",
    {
      title: "Create Wallet",
      description: "Create a new random wallet",
      inputSchema: z.object({
        network: z.enum(["mainnet", "testnet", "regtest"]).default("testnet").describe("BTC network"),
        type: z.enum(["seed", "wif"]).default("seed").describe("Wallet type"),
        name: z.string().optional().describe("Optional name for persistent wallet")
      })
    },
    async ({ network, type, name }) => {
      let wallet;
      if (name) {
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
              privateKeyWif: wallet.privateKeyWif,
              network
            }, null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "wallet_from_id",
    {
      title: "Wallet Info from ID",
      description: "Get wallet details from a walletId",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId (e.g., 'wif:testnet:...')")
      })
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
              network: wallet.network
            }, null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "get_balance",
    {
      title: "Get Balance",
      description: "Get the BCH balance of a wallet",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId"),
        unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for balance")
      })
    },
    async ({ walletId, unit }) => {
      const wallet = await walletFromId(walletId);
      const balance = await wallet.getBalance(unit);
      return {
        content: [
          {
            type: "text",
            text: typeof balance === "object" ? JSON.stringify(balance, null, 2) : `${balance} ${unit}`
          }
        ]
      };
    }
  );
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
          unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for amount")
        })).describe("List of recipients")
      })
    },
    async ({ walletId, to }) => {
      const wallet = await walletFromId(walletId);
      const requests = to.map((r) => ({
        cashaddr: r.cashaddr,
        value: r.value,
        unit: r.unit
      }));
      const response = await wallet.send(requests);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "send_max",
    {
      title: "Send Max",
      description: "Send all available funds to an address",
      inputSchema: z.object({
        walletId: z.string().describe("The source walletId"),
        address: z.string().describe("Recipient address")
      })
    },
    async ({ walletId, address }) => {
      const wallet = await walletFromId(walletId);
      const response = await wallet.sendMax(address);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "op_return_send",
    {
      title: "Send OP_RETURN",
      description: "Send a transaction with OP_RETURN data",
      inputSchema: z.object({
        walletId: z.string().describe("The source walletId"),
        data: z.array(z.string()).describe("List of strings to push to OP_RETURN")
      })
    },
    async ({ walletId, data }) => {
      const wallet = await walletFromId(walletId);
      const response = await wallet.send([
        OpReturnData.fromArray(data)
      ]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "get_history",
    {
      title: "Get History",
      description: "Get transaction history for a wallet",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId"),
        unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for amounts in history"),
        start: z.number().default(0).describe("Starting index (reverse chronological)"),
        count: z.number().default(10).describe("Number of transactions to return")
      })
    },
    async ({ walletId, unit, start, count }) => {
      const wallet = await walletFromId(walletId);
      const history = await wallet.getHistory(unit, start, count);
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(history), null, 2) }]
      };
    }
  );
  server.registerTool(
    "sign_message",
    {
      title: "Sign Message",
      description: "Sign a message with the wallet's private key",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId"),
        message: z.string().describe("The message to sign")
      })
    },
    async ({ walletId, message }) => {
      const wallet = await walletFromId(walletId);
      const sigResult = await wallet.sign(message);
      return {
        content: [{ type: "text", text: JSON.stringify(sigResult, null, 2) }]
      };
    }
  );
  server.registerTool(
    "verify_message",
    {
      title: "Verify Message",
      description: "Verify a message signature",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId (can be watch-only)"),
        message: z.string().describe("The original message"),
        signature: z.string().describe("The signature to verify")
      })
    },
    async ({ walletId, message, signature }) => {
      const wallet = await walletFromId(walletId);
      const verifyResult = await wallet.verify(message, signature);
      return {
        content: [{ type: "text", text: JSON.stringify(verifyResult, null, 2) }]
      };
    }
  );
  server.registerTool(
    "wait_for_transaction",
    {
      title: "Wait for Transaction",
      description: "Halt until a transaction is received",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId")
      })
    },
    async ({ walletId }) => {
      const wallet = await walletFromId(walletId);
      const response = await wallet.waitForTransaction();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "wait_for_balance",
    {
      title: "Wait for Balance",
      description: "Halt until the wallet reaches a certain balance",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId"),
        value: z.number().describe("Target balance"),
        unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for target balance")
      })
    },
    async ({ walletId, value, unit }) => {
      const wallet = await walletFromId(walletId);
      const response = await wallet.waitForBalance(value, unit);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "get_testnet_satoshis",
    {
      title: "Get Testnet Satoshis",
      description: "Request free testnet satoshis from the faucet",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId to receive sats")
      })
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
      const result = await response.json();
      if (result.error) {
        return {
          content: [{ type: "text", text: `Faucet error: ${result.error}` }]
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Success! Transaction ID: ${result.txId}`
          }
        ]
      };
    }
  );
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
        cashaddr: z.string().optional().describe("Recipient address for tokens")
      })
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
        commitment,
        capability: capMap[capability],
        cashaddr: cashaddr || wallet.cashaddr
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
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
        capability: z.enum(["none", "mutable", "minting"]).optional().describe("NFT capability")
      })
    },
    async ({ walletId, tokenId, amount, cashaddr, commitment, capability }) => {
      const wallet = await walletFromId(walletId);
      const capMap = capability ? {
        "none": NFTCapability.none,
        "mutable": NFTCapability.mutable,
        "minting": NFTCapability.minting
      }[capability] : void 0;
      const response = await wallet.send([
        new TokenSendRequest({
          cashaddr,
          amount: BigInt(amount),
          tokenId,
          commitment,
          capability: capMap
        })
      ]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
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
          value: z.number().optional().describe("Satoshi value for the output")
        })),
        deductTokenAmount: z.boolean().default(true).describe("Whether to reduce the FT amount of the minting token")
      })
    },
    async ({ walletId, tokenId, requests, deductTokenAmount }) => {
      const wallet = await walletFromId(walletId);
      const capMap = {
        "none": NFTCapability.none,
        "mutable": NFTCapability.mutable,
        "minting": NFTCapability.minting
      };
      const mintRequests = requests.map((r) => new TokenMintRequest({
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
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
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
        message: z.string().optional().describe("Optional OP_RETURN message")
      })
    },
    async ({ walletId, tokenId, amount, capability, commitment, message }) => {
      const wallet = await walletFromId(walletId);
      const capMap = capability ? {
        "none": NFTCapability.none,
        "mutable": NFTCapability.mutable,
        "minting": NFTCapability.minting
      }[capability] : void 0;
      const response = await wallet.tokenBurn(
        {
          tokenId,
          amount: BigInt(amount),
          capability: capMap,
          commitment
        },
        message
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serialize(response), null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "get_token_balance",
    {
      title: "Get Token Balance",
      description: "Get the fungible token balance of a specific category",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId"),
        tokenId: z.string().describe("Token category ID")
      })
    },
    async ({ walletId, tokenId }) => {
      const wallet = await walletFromId(walletId);
      const balance = await wallet.getTokenBalance(tokenId);
      return {
        content: [{ type: "text", text: balance.toString() }]
      };
    }
  );
  server.registerTool(
    "get_nft_token_balance",
    {
      title: "Get NFT Token Balance",
      description: "Get the count of NFT tokens of a specific category",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId"),
        tokenId: z.string().describe("Token category ID")
      })
    },
    async ({ walletId, tokenId }) => {
      const wallet = await walletFromId(walletId);
      const balance = await wallet.getNftTokenBalance(tokenId);
      return {
        content: [{ type: "text", text: balance.toString() }]
      };
    }
  );
  server.registerTool(
    "get_all_token_balances",
    {
      title: "Get All Token Balances",
      description: "Get all fungible token balances",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId")
      })
    },
    async ({ walletId }) => {
      const wallet = await walletFromId(walletId);
      const balances = await wallet.getAllTokenBalances();
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(balances), null, 2) }]
      };
    }
  );
  server.registerTool(
    "get_all_nft_token_balances",
    {
      title: "Get All NFT Token Balances",
      description: "Get all NFT token balances",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId")
      })
    },
    async ({ walletId }) => {
      const wallet = await walletFromId(walletId);
      const balances = await wallet.getAllNftTokenBalances();
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(balances), null, 2) }]
      };
    }
  );
  server.registerTool(
    "get_token_utxos",
    {
      title: "Get Token UTXOs",
      description: "Get all UTXOs containing tokens",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId"),
        tokenId: z.string().optional().describe("Filter by tokenId")
      })
    },
    async ({ walletId, tokenId }) => {
      const wallet = await walletFromId(walletId);
      const utxos = await wallet.getTokenUtxos(tokenId);
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(utxos), null, 2) }]
      };
    }
  );
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
        network: z.enum(["mainnet", "testnet", "regtest"]).default("testnet").describe("Network")
      })
    },
    async ({ arbiterAddr, buyerAddr, sellerAddr, amount, network }) => {
      const escrow = new EscrowContract({
        arbiterAddr,
        buyerAddr,
        sellerAddr,
        amount: BigInt(amount)
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            address: escrow.getDepositAddress(),
            contractId: escrow.toString()
          }, null, 2)
        }]
      };
    }
  );
  server.registerTool(
    "convert_currency",
    {
      title: "Convert Currency",
      description: "Convert between BCH, SAT, and USD",
      inputSchema: z.object({
        amount: z.number().describe("Amount to convert"),
        from: z.string().describe("Source unit"),
        to: z.string().describe("Target unit")
      })
    },
    async ({ amount, from, to }) => {
      const result = await convert(amount, from, to);
      return {
        content: [{ type: "text", text: result.toString() }]
      };
    }
  );
  server.registerTool(
    "qr_address",
    {
      title: "QR Code for Address",
      description: "Generate a QR code SVG data URI for a BCH address",
      inputSchema: z.object({
        address: z.string().describe("BCH address"),
        size: z.number().default(256).describe("Size of the QR code")
      })
    },
    async ({ address, size }) => {
      const svg = new QRCode({
        content: address,
        width: size,
        height: size
      }).svg();
      const svgB64 = Buffer.from(svg).toString("base64");
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            src: `data:image/svg+xml;base64,${svgB64}`,
            title: address,
            alt: "a Bitcoin Cash address QR Code"
          }, null, 2)
        }]
      };
    }
  );
  server.registerTool(
    "decode_transaction",
    {
      title: "Decode Transaction",
      description: "Decode a transaction hex or search by hash",
      inputSchema: z.object({
        transaction: z.string().describe("Transaction hex or hash"),
        loadInputValues: z.boolean().default(true).describe("Whether to load input values from the blockchain")
      })
    },
    async ({ transaction, loadInputValues }) => {
      const decoded = await Wallet.util.decodeTransaction(transaction, loadInputValues);
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(decoded), null, 2) }]
      };
    }
  );
  server.registerTool(
    "wallet_from_seed",
    {
      title: "Wallet from Seed Phrase",
      description: "Restore a wallet from a mnemonic seed phrase",
      inputSchema: z.object({
        seedPhrase: z.string().describe("12 or 24 word mnemonic seed phrase"),
        derivationPath: z.string().default("m/44'/0'/0'/0/0").describe("BIP44 derivation path"),
        network: z.enum(["mainnet", "testnet"]).default("testnet").describe("Network")
      })
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
            network
          }, null, 2)
        }]
      };
    }
  );
  server.registerTool(
    "wallet_from_wif",
    {
      title: "Wallet from WIF",
      description: "Restore a wallet from a WIF (Wallet Import Format) private key",
      inputSchema: z.object({
        wif: z.string().describe("WIF private key"),
        network: z.enum(["mainnet", "testnet"]).default("testnet").describe("Network")
      })
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
            network
          }, null, 2)
        }]
      };
    }
  );
  server.registerTool(
    "wallet_watch_only",
    {
      title: "Create Watch-Only Wallet",
      description: "Create a watch-only wallet from a cash address (can view but not spend)",
      inputSchema: z.object({
        cashaddr: z.string().describe("Cash address to watch"),
        network: z.enum(["mainnet", "testnet"]).default("testnet").describe("Network")
      })
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
            network,
            isWatchOnly: true
          }, null, 2)
        }]
      };
    }
  );
  server.registerTool(
    "get_utxos",
    {
      title: "Get UTXOs",
      description: "Get all unspent transaction outputs for a wallet",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId")
      })
    },
    async ({ walletId }) => {
      const wallet = await walletFromId(walletId);
      const utxos = await wallet.getUtxos();
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(utxos), null, 2) }]
      };
    }
  );
  server.registerTool(
    "get_max_amount_to_send",
    {
      title: "Get Max Amount to Send",
      description: "Get the maximum amount that can be sent (balance minus fees)",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId"),
        outputCount: z.number().default(1).describe("Number of outputs in the transaction")
      })
    },
    async ({ walletId, outputCount }) => {
      const wallet = await walletFromId(walletId);
      const maxAmount = await wallet.getMaxAmountToSend({ outputCount });
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(maxAmount), null, 2) }]
      };
    }
  );
  server.registerTool(
    "get_raw_history",
    {
      title: "Get Raw Transaction History",
      description: "Get raw transaction history for a wallet (chronological order)",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId")
      })
    },
    async ({ walletId }) => {
      const wallet = await walletFromId(walletId);
      const history = await wallet.getRawHistory();
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(history), null, 2) }]
      };
    }
  );
  server.registerTool(
    "get_block_height",
    {
      title: "Get Block Height",
      description: "Get the current blockchain block height",
      inputSchema: z.object({
        network: z.enum(["mainnet", "testnet"]).default("testnet").describe("Network")
      })
    },
    async ({ network }) => {
      let wallet;
      if (network === "mainnet") {
        wallet = await Wallet.newRandom();
      } else {
        wallet = await TestNetWallet.newRandom();
      }
      const height = await wallet.provider.getBlockHeight();
      return {
        content: [{ type: "text", text: JSON.stringify({ blockHeight: height, network }, null, 2) }]
      };
    }
  );
  server.registerTool(
    "get_bch_price",
    {
      title: "Get BCH Price",
      description: "Get the current BCH price in USD",
      inputSchema: z.object({})
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
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }, null, 2)
        }]
      };
    }
  );
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
          unit: z.enum(["bch", "sat", "usd"]).default("bch").describe("Unit for amount")
        })).describe("List of recipients")
      })
    },
    async ({ walletId, to }) => {
      const wallet = await walletFromId(walletId);
      const requests = to.map((r) => ({
        cashaddr: r.cashaddr,
        value: r.value,
        unit: r.unit
      }));
      const encoded = await wallet.encodeTransaction(requests);
      return {
        content: [{ type: "text", text: JSON.stringify({ hex: encoded }, null, 2) }]
      };
    }
  );
  server.registerTool(
    "submit_transaction",
    {
      title: "Submit Transaction",
      description: "Broadcast a signed transaction hex to the network",
      inputSchema: z.object({
        walletId: z.string().describe("Any walletId (used for network connection)"),
        transactionHex: z.string().describe("Signed transaction in hex format")
      })
    },
    async ({ walletId, transactionHex }) => {
      const wallet = await walletFromId(walletId);
      const txId = await wallet.submitTransaction(transactionHex);
      return {
        content: [{ type: "text", text: JSON.stringify({ txId }, null, 2) }]
      };
    }
  );
  server.registerTool(
    "get_public_key",
    {
      title: "Get Public Key",
      description: "Get the compressed public key and public key hash for a wallet",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId")
      })
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
        }]
      };
    }
  );
  server.registerTool(
    "get_deposit_address",
    {
      title: "Get Deposit Address",
      description: "Get the deposit address for a wallet (both regular and token addresses)",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId")
      })
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
        }]
      };
    }
  );
  server.registerTool(
    "escrow_get_balance",
    {
      title: "Get Escrow Balance",
      description: "Get the balance of an escrow contract",
      inputSchema: z.object({
        contractId: z.string().describe("The escrow contract ID")
      })
    },
    async ({ contractId }) => {
      const escrow = EscrowContract.fromId(contractId);
      const balance = await escrow.getBalance();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            balance,
            address: escrow.getDepositAddress()
          }, null, 2)
        }]
      };
    }
  );
  server.registerTool(
    "escrow_spend",
    {
      title: "Escrow Spend",
      description: "Release escrow funds to the seller (buyer or arbiter can call)",
      inputSchema: z.object({
        contractId: z.string().describe("The escrow contract ID"),
        wif: z.string().describe("Private key (WIF) of buyer or arbiter")
      })
    },
    async ({ contractId, wif }) => {
      const escrow = EscrowContract.fromId(contractId);
      const result = await escrow.call(wif, "spend");
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(result), null, 2) }]
      };
    }
  );
  server.registerTool(
    "escrow_refund",
    {
      title: "Escrow Refund",
      description: "Refund escrow funds to the buyer (seller or arbiter can call)",
      inputSchema: z.object({
        contractId: z.string().describe("The escrow contract ID"),
        wif: z.string().describe("Private key (WIF) of seller or arbiter")
      })
    },
    async ({ contractId, wif }) => {
      const escrow = EscrowContract.fromId(contractId);
      const result = await escrow.call(wif, "refund");
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(result), null, 2) }]
      };
    }
  );
  server.registerTool(
    "get_token_deposit_address",
    {
      title: "Get Token Deposit Address",
      description: "Get the token-aware deposit address for receiving CashTokens",
      inputSchema: z.object({
        walletId: z.string().describe("The walletId")
      })
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
        }]
      };
    }
  );
  server.registerTool(
    "return_testnet_satoshis",
    {
      title: "Return Testnet Satoshis",
      description: "Return testnet satoshis back to the faucet",
      inputSchema: z.object({
        walletId: z.string().describe("The testnet walletId")
      })
    },
    async ({ walletId }) => {
      const wallet = await walletFromId(walletId);
      if (wallet.network !== "testnet") {
        return {
          content: [{ type: "text", text: "This function only works on testnet" }]
        };
      }
      const result = await wallet.returnTestnetSatoshis();
      return {
        content: [{ type: "text", text: JSON.stringify(serialize(result), null, 2) }]
      };
    }
  );
  server.registerTool(
    "validate_address",
    {
      title: "Validate Address",
      description: "Validate a Bitcoin Cash address and get its details",
      inputSchema: z.object({
        address: z.string().describe("The address to validate")
      })
    },
    async ({ address }) => {
      try {
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
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              valid: false,
              error: error.message
            }, null, 2)
          }]
        };
      }
    }
  );
  return server.server;
}

// src/server.ts
import http from "http";
var config = configSchema.parse({
  debug: process.env.DEBUG === "true"
});
var mcpServer = createServer({ config });
var transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID()
});
await mcpServer.connect(transport);
var mcpCard = {
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
var mcpConfigSchema = {
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
var httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;
  console.log(`${req.method} ${pathname}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id, mcp-protocol-version");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (pathname === "/mcp" || pathname.endsWith("/mcp")) {
    if (req.method === "POST") {
      console.log("Handling MCP POST request on /mcp");
      await transport.handleRequest(req, res);
      return;
    }
  }
  if (req.method === "POST" && pathname === "/") {
    console.log("Handling MCP POST request on /");
    await transport.handleRequest(req, res);
    return;
  }
  if (req.method === "GET" && pathname.includes(".well-known/mcp.json")) {
    console.log("Serving MCP Server Card");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(mcpCard, null, 2));
    return;
  }
  if (req.method === "GET" && pathname.includes(".well-known/mcp-config")) {
    console.log("Serving MCP Config Schema");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(mcpConfigSchema, null, 2));
    return;
  }
  if (req.method === "GET" && (pathname === "/health" || pathname.endsWith("/health"))) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
    return;
  }
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
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
var port = parseInt(process.env.PORT || "8081");
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`BCH MCP Server listening on http://0.0.0.0:${port}`);
  console.log(`MCP endpoint: http://0.0.0.0:${port}/mcp`);
  console.log(`Health check: http://0.0.0.0:${port}/health`);
});
