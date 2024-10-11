import { Utils, Crypto } from "@archethicjs/sdk";

export function shortenAddress(address) {
  return `${address.slice(0, 8)}...${address.slice(address.length - 8)}`;
}

export function isValidAddress(address) {
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
    }
  } catch (e) {
    return false;
  }
}

export function extractActionsFromContract(code) {
  const regex =
    /actions\s+triggered_by:\s+transaction,\s+on:\s+([\w\s.,()]+?)\s+do/g;

  let actions = [];
  for (const match of code.matchAll(regex)) {
    const fullAction = match[1];

    const regexActionName = /(\w+)\((.*?)\)/g;
    for (const actionMatch of fullAction.matchAll(regexActionName)) {
      const name = actionMatch[1];
      const parameters = actionMatch[2] != "" ? actionMatch[2].split(",") : [];
      actions.push({
        name: name,
        parameters: parameters,
      });
    }
  }

  return actions;
}

export function explorerLink(connectionStore, address, chain = false) {
  if (chain) {
    return `${connectionStore.endpoint}/explorer/chain?address=${address}`
  }
  return `${connectionStore.endpoint}/explorer/transaction/${address}`
}