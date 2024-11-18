import { Utils, Crypto } from "@archethicjs/sdk";
import type { ConnectionStore } from "./stores/connection";

export function shortenAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(address.length - 8)}`;
}

export function isValidAddress(address: string): boolean {
  if (!Utils.isHex(address)) {
    return false;
  }

  if (address.length < 4) {
    return false;
  }

  const curveId = Utils.hexToUint8Array(address.slice(0, 2))[0];
  try {
    Crypto.IDToCurve(curveId);
  } catch (e) {
    return false;
  }

  try {
    const hashAlgoId = Utils.hexToUint8Array(address.slice(2, 4))[0];
    const hashAlgo = Crypto.IDToHashAlgo(hashAlgoId);
    const digest = Utils.hexToUint8Array(address.slice(4, address.length));
    switch (hashAlgo) {
      case "sha256":
        return digest.length == 32;
      case "sha512":
        return digest.length == 64;
      case "sha3-256":
        return digest.length == 32;
      case "sha3-512":
        return digest.length == 64;
      case "blake2b":
        return digest.length == 64;
      default:
        throw new Error("Unsupported algo")
    }
  } catch (e) {
    return false;
  }
}

export function explorerLink(endpoint: string, address: string, chain = false): string {
  if (chain) {
    return `${endpoint}/explorer/chain?address=${address}`;
  }
  return `${endpoint}/explorer/transaction/${address}`;
}
