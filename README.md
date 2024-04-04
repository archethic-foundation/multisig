# multisig

Multisig Solution based on Archethic

## CLI

A CLI is available to deploy and interact with a multisignature contract

### Installation

```bash
cd cli
npm install
```

Archethic's wallet must be installed and running

The network used in the wallet, will be used for deployment and interaction.

### Usage

- Deploy a mulitisignature contract:

```bash
node multisig.js deploy
```

- Propose a new transaction

```bash
node multisig.js new-transaction
```

- Confirm a transaction

```bash
node multisig.js confirm-transaction
```
