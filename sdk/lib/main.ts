import Archethic from "@archethicjs/sdk";
import TransactionBuilder from "@archethicjs/sdk/dist/transaction_builder";
import { AuthorizedKeyUserInput } from "@archethicjs/sdk/dist/types";

export type MultisigInit = {
  voters: string[],
  confirmationThreshold: number
}

export type MultisigSetup = {
  newVoters?: string[];
  removedVoters?: string[];
  confirmationThreshold?: number;
}

export type MultisigTransaction = {
  content?: string;
  code?: string;
  ucoTransfers: UCOTransfer[];
  tokenTransfers: TokenTransfer[];
  recipients: Recipient[];
}

interface Transfer {
  amount: number;
  to: string;
} 

export type UCOTransfer = Transfer;
export type TokenTransfer = {
  tokenAddress: string;
  tokenId?: string;
} & Transfer

export type Recipient = {
  address: string;
  action?: string;
  args?: any[]
}

export function getDeployTransaction(archethic: Archethic, setup: MultisigInit, encryptedSeed: Uint8Array | string, authorizedEncryptedKeys: AuthorizedKeyUserInput[]): TransactionBuilder {
  return archethic.transaction.new()
    .setType("contract")
    .setCode(code)
    .setContent(JSON.stringify({
      voters: setup.voters,
      confirmation_threshold: setup.confirmationThreshold,
    }))
    .addOwnership(encryptedSeed, authorizedEncryptedKeys)
}

export function getProposeTransaction(archethic: Archethic, contractAddress: string, txData: MultisigTransaction, setup: MultisigSetup): TransactionBuilder {
  const contractTxData = {
    content: txData.content,
    code: txData.code,
    ucoTransfers: txData.ucoTransfers,
    tokenTransfers: txData.tokenTransfers.map((t) => {
      return { to: t.to, amount: t.amount, token_address: t.tokenAddress, token_id: t.tokenId || 0 }
    }),
    recipients: txData.recipients
  }

  const contractSetup = {
    new_voters: setup.newVoters,
    revoved_voters: setup.removedVoters,
    confirmation_threshold: setup.confirmationThreshold
  }

  return archethic.transaction
    .new()
    .setType("transfer")
    .addRecipient(contractAddress, "new_transaction", [contractTxData, contractSetup]);
}

export function getConfirmTransaction(archethic: Archethic, contractAddress: string, transactionId: number): TransactionBuilder {
  return archethic?.transaction
    .new()
    .setType("transfer")
    .addRecipient(contractAddress, "confirm_transaction", [transactionId]);
}

const code = `
@version 1

##########################
# MultiSig Smart Contract
##########################

# Propose a new transaction using transaction's data and multisig new setup
# Transaction data includes:
#  - uco transfers
#  - token transfers
#  - recipients (contract calls)
#  - code (updgrade multisig code)
#  - content
#
# Mulitisig setup includes:
# - New voters
# - Removed voters
# _ Confirmation threshold
condition triggered_by: transaction, on: new_transaction(tx_data, setup), as: [
  previous_public_key: authorized?(transaction_genesis()),
  content: (
    code = Map.get(tx_data, "code")
    uco_transfers = Map.get(tx_data, "uco_transfers", [])
    token_transfers = Map.get(tx_data, "token_transfers", [])
    recipients = Map.get(tx_data, "recipients", [])

    valid_tx_data? = valid_code?(code) && valid_uco_transfers?(uco_transfers) && valid_token_transfers?(token_transfers) && valid_recipients?(recipients)

    valid_tx_data? && valid_setup?(setup)
  )
]

actions triggered_by: transaction, on: new_transaction(tx_data, setup) do
  last_transaction_id = State.get("transaction_id", 0)
  transaction_id = last_transaction_id + 1

  voter_genesis_address = transaction_genesis(transaction.previous_public_key)

  transactions = State.get("transactions", Map.new())
  transactions = Map.set(transactions, transaction_id, [
    status: "pending",
    tx_data: tx_data,
    setup: setup,
    from: voter_genesis_address,
    confirmations: [],
    origin_tx: transaction.address
  ])

  State.set("transactions", transactions)

  # Write to state the voters to free the content zone(used for contract initialization)
  if State.get("voters") == nil do
    content = Json.parse(contract.content)
    initial_voters = Map.get(content, "voters", [])
    State.set("voters", uniform_voter_addresses(initial_voters))
    State.set("confirmation_threshold", Map.get(content, "confirmationThreshold", 1))
  end

  State.set("transaction_id", transaction_id)
end

condition triggered_by: transaction, on: confirm_transaction(transaction_id), as: [
  content: (
    transactions = State.get("transactions", Map.new())
    transaction = Map.get(transactions, transaction_id)
    transaction != nil && Map.get(transaction, "status") == "pending"
  ),
  address: (
    voter_genesis_address = transaction_genesis(transaction.previous_public_key)
    voters = State.get("voters")
    confirmation_threshold = State.get("confirmation_threshold")
    if confirmation_threshold > 1 do
        authorized?(voter_genesis_address) && !emitter?(voter_genesis_address, transaction_id) && !already_voted?(voter_genesis_address, transaction_id)
    else
        authorized?(voter_genesis_address)
    end
  )
]

actions triggered_by: transaction, on: confirm_transaction(transaction_id) do
  transactions = State.get("transactions", Map.new())
  tx = Map.get(transactions, transaction_id)
  tx_confirmations = Map.get(tx, "confirmations")

  if confirmation_threshold_reached?(tx_confirmations) do
    tx_data = Map.get(tx, "tx_data")
    setup = Map.get(tx, "setup")

    uco_transfers = Map.get(tx_data, "uco_transfers", [])
    token_transfers = Map.get(tx_data, "token_transfers", [])
    code = Map.get(tx_data, "code", "")
    recipients = Map.get(tx_data, "recipients", [])
    content = Map.get(tx_data, "content", "")

    typed = false
    if List.size(uco_transfers) > 0 || List.size(token_transfers) > 0 || List.size(recipients) > 0 do
      Contract.set_type("transfer")
      Contract.add_uco_transfers(uco_transfers)
      Contract.add_token_transfers(token_transfers)
      Contract.add_recipients(recipients)
      typed = true
    end

    if code != "" do
      if !typed do
        Contract.set_type "contract"
      end
      Contract.set_code(code)
    end

    if content != "" do
      if !typed do
        Contract.set_type("data")
      end
      Contract.set_content(content)
    end

    if setup != nil do
      new_voters = uniform_voter_addresses(Map.get(setup, "new_voters", []))
      removed_voters = uniform_voter_addresses(Map.get(setup, "removed_voters", []))
      existing_voters = State.get("voters")

      filtered_voters = []
      if !List.empty?(removed_voters) do
         for existing_voter in existing_voters do
            if !List.in?(removed_voters, existing_voter) do
                filtered_voters = List.append(filtered_voters, existing_voter)
            end
        end
      else
        filtered_voters = existing_voters
      end

      State.set("voters", filtered_voters ++ new_voters)

      new_confirmation_threshold = Map.get(setup, "confirmation_threshold")
      if new_confirmation_threshold != nil do
        State.set("confirmation_threshold", new_confirmation_threshold)
      end
    end

    confirmed_tx = [
        status: "done",
        origin_tx: Map.get(tx, "origin_tx"),
        confirmations:  List.append(tx_confirmations, transaction.address),
        details_tx: contract.address
    ]
    transactions = Map.set(transactions, transaction_id, confirmed_tx)
    State.set("transactions", transactions)
  else
    tx_confirmations = List.append(tx_confirmations, transaction.address)
    confirmed_tx = Map.set(tx, "confirmations", tx_confirmations)
    transactions = Map.set(transactions, transaction_id, confirmed_tx)
    State.set("transactions", transactions)
  end
end

export fun transaction_status(transaction_id) do
  transactions = State.get("transactions", Map.new())
  Map.get(transactions, transaction_id, [
    status: "not exists",
    tx_data: [
        uco_transfers: [],
        token_transfers: [],
        code: "",
        recipients: []
    ],
    setup: [
        confirmation_threshold: 0,
        voters: []
    ]
  ])
end

export fun status() do
  voters = State.get("voters")
  confirmation_threshold = State.get("confirmation_threshold")

  if voters == nil do
    initial_content = Json.parse(contract.content)
    initial_voters = Map.get(initial_content, "voters")

    # Uniform voter addresses case
    voters = []
    for voter in initial_voters do
        voters = List.append(voters, String.to_hex(voter))
    end

    confirmation_threshold = Map.get(initial_content, "confirmationThreshold", 1)
  end

  [
    setup: [
      voters: voters,
      confirmation_threshold: confirmation_threshold
    ],
    transactions: State.get("transactions", Map.new())
  ]
end

fun authorized?(genesis_address) do
  setup = Map.get(status(), "setup")
  List.in?(setup.voters, genesis_address)
end

fun emitter?(genesis_address, transaction_id) do
  transactions = State.get("transactions", Map.new())
  tx = Map.get(transactions, transaction_id)
  Map.get(tx, "from") == genesis_address
end

fun transaction_genesis(previous_public_key) do
  previous_address = Chain.get_previous_address(previous_public_key)
  Chain.get_genesis_address(previous_address)
end

fun valid_setup?(new_setup) do
  new_voters = Map.get(new_setup, "new_voters", [])
  removed_voters = Map.get(new_setup, "removed_voters", [])
  confirmation_threshold = Map.get(new_setup, "confirmationThreshold", 1)

  existing_setup = Map.get(status(), "setup")
  existing_voters = Map.get(existing_setup, "voters")
  valid_voters? = List.empty?(new_voters) || false
  for voter in new_voters do
      valid_voters? = !List.in?(existing_voters, String.to_hex(voter))
  end

  for voter in removed_voters do
    valid_voters? = List.in?(existing_voters, String.to_hex(voter))
  end

  confirmation_threshold > 0 && valid_voters?
end


fun valid_code?(code) do
  valid? = true
  if code != "" do
    valid? = Code.is_valid?(code)
  end
  valid?
end

fun valid_uco_transfers?(transfers) do
  if List.empty?(transfers) do
      true
  else
    valid? = false
    for transfer in transfers do
      to = Map.get(transfer, "to")
      amount = Map.get(transfer, "amount")
      valid? = to != nil && (amount != nil && amount > 0)
    end
    valid?
  end
end

fun valid_token_transfers?(transfers) do
  if List.empty?(transfers) do
    true
  else
    valid? = false
    for transfer in transfers do
      to = Map.get(transfer, "to")
      amount = Map.get(transfer, "amount")
      token = Map.get(transfer, "token_address")

      # Check the existence of the token's chain
      Chain.get_first_transaction_address(token)

      valid? = to != nil && (amount != nil && amount > 0)
    end
    valid?
  end
end

fun valid_recipients?(recipients) do
  if List.empty?(recipients) do
    true
  else
    valid? = false
    for recipient in recipients do
      contract_address = Map.get(recipient, "address")
      action = Map.get(recipient, "action")

      # Check the existence of the contract's chain
      Chain.get_first_transaction_address(contract_address)

      # Check an action is given
      valid? = action != nil && String.size(action) > 0
    end
    valid?
  end
end

fun confirmation_threshold_reached?(tx_confirmations) do
  confirmation_threshold = State.get("confirmation_threshold", 1)
  List.size(tx_confirmations) + 1 >= confirmation_threshold
end

fun already_voted?(voter_genesis_address, transaction_id) do
  transactions = State.get("transactions", Map.new())
  tx = Map.get(transactions, transaction_id, Map.new())
  tx_confirmations = Map.get(tx, "confirmations", [])

  voted? = false
  for confirmation_address in tx_confirmations do
    voted? = Chain.get_genesis_address(confirmation_address) == voter_genesis_address
  end
  voted?
end

fun uniform_voter_addresses(voter_addresses) do
  voters = []
  for voter in voter_addresses do
    voters = List.append(voters, String.to_hex(voter))
  end
  voters
end
`