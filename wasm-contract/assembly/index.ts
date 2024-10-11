import {
    ActionResult,
    ContextWithTransaction,
    JSON,
    ContextWithTransactionAndParams,
    TriggerType,
    getFirstTransactionAddress,
    Address,
    ContextWithParams,
    Context,
} from "@archethicjs/ae-contract-as/assembly";

import { InitParams, ProposalParams, ConfirmationParams, DetailsParams } from "./params";
import { State, Transaction } from "./state"
import { VoterSet } from "./voter_set";

export function onInit(context: ContextWithTransaction<State>): State {
    const initParams = JSON.parse<InitParams>(context.transaction.data.content)
    return new State(initParams.voters, initParams.confirmationThreshold);
}

// @ts-ignore
@action(TriggerType.Transaction)
export function proposeTransaction(context: ContextWithTransactionAndParams<State, ProposalParams>): ActionResult<State> {
    const voterAddress = context.transaction.genesis
    const voterSet = new VoterSet(context.state.voters)

    assert(voterSet.has(voterAddress), "not authorized")

    const setup = context.arguments.setup
    const txData = context.arguments.txData

    if (setup != null) {
        const threshold = setup.confirmationThreshold
        if (threshold != null) {
            assert(threshold.value > voterSet.size, "confirmationThreshold must be greater than the number of voters");
        }
        for (let i = 0; i < setup.newVoters.length; i++) {
            assert(!voterSet.has(setup.newVoters[i]), "cannot add an existing voter")
        }

        for (let i = 0; i < setup.removedVoters.length; i++) {
            assert(voterSet.has(setup.newVoters[i]), "cannot remove an non-existing voter")
        }
    }

    if (txData != null) {
        for (let i = 0; i < txData.ucoTransfers.length; i++) {
            assert(txData.ucoTransfers[i].amount > 0, "UCO transfer must be greated than zero")
        }
        for (let i = 0; i < txData.tokenTransfers.length; i++) {
            assert(txData.tokenTransfers[i].amount > 0, "Token transfer must be greated than zero")
            getFirstTransactionAddress(txData.tokenTransfers[i].tokenAddress) // Check token existance
        }
        for (let i = 0; i < txData.recipients.length; i++) {
            getFirstTransactionAddress(txData.recipients[i].address) // Check contract existance
        }
    }

    const state = context.state
    const txID = state.getLastID()
    const tx = new Transaction(voterAddress, context.transaction.address, txData, setup)

    return new ActionResult<State>().setState(state.setTransactionById(txID, tx))
}

// @ts-ignore
@action(TriggerType.Transaction)
export function confirmTransaction(context: ContextWithTransactionAndParams<State, ConfirmationParams>): ActionResult<State> {
    const transactionId = context.arguments.transactionId;
    assert(context.state.transactions.has(transactionId), "transaction id does not exists");

    const transaction = context.state.transactions.get(transactionId)

    const voterAddress = context.transaction.genesis
    
    const voterSet = new VoterSet(context.state.voters)
    assert(voterSet.has(voterAddress), "not authorized")
    
    if (voterSet.size > 1) {
        assert(!transaction.alreadyVoted(voterAddress), "already voted");
        assert(!Address.compare(transaction.from, voterAddress), "emitter cannot confirm")
    }

    let result = new ActionResult<State>()

    const txAddress = context.transaction.address
    if(transaction.isThresholdReached(context.state.confirmationThreshold)) {
        const txData = transaction.txData 
        if (txData != null) {
            result.setTransaction(txData.getTransactionBuilder())
        }

        const newState = context.state
        const setup = transaction.setup
        if (setup != null) {
            const threshold = setup.confirmationThreshold
            if (threshold != null) {
                newState.confirmationThreshold = threshold.value;
            }

            const voterSet = new VoterSet(context.state.voters)
            for (let i = 0; i < setup.removedVoters.length; i++) {
                voterSet.delete(setup.removedVoters[i])
            }
            for (let i = 0; i < setup.newVoters.length; i++) {
                voterSet.add(setup.newVoters[i])
            }
            newState.voters = voterSet.toAddressList()
        }
        transaction.confirm(voterAddress, txAddress)
        transaction.seal(context.contract.address)
        newState.setTransactionById(transactionId, transaction)
        result.setState(newState)
    }
    else {
        transaction.confirm(voterAddress, txAddress)
        result.setState(context.state.setTransactionById(transactionId, transaction))
    }
    
    return result
}

// @ts-ignore
@publicFunction()
export function getTransactionDetails(context: ContextWithParams<State, DetailsParams>): Transaction | null{
    if(!context.state.transactions.has(context.arguments.transactionId)) return null
    return context.state.transactions.get(context.arguments.transactionId)
}

// @ts-ignore
@publicFunction()
export function getState(context: Context<State>): State {
    return context.state
}