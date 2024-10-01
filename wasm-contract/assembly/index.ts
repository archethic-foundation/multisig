import {
    ActionResult,
    ContextWithTransaction,
    JSON,
    ContextWithTransactionAndParams,
    TriggerType,
    getFirstTransactionAddress,
    Address,
    ContextWithParams,
    log,
    Context
} from "@archethicjs/ae-contract-as/assembly";
import { InitParams, ProposalParams, ConfirmationParams, State, Status, Transaction, VoterSet, TxData } from "./types";

export function onInit(context: ContextWithTransaction<State>): State {
    const initParams = JSON.parse<InitParams>(context.transaction.data.content)
    return new State(initParams.voters, initParams.confirmationThreshold);
}

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

    const txID = context.state.setNewID() 
    context.state.transactions.set(txID, {
        setup: context.arguments.setup,
        txData: context.arguments.txData,
        originTx: context.transaction.address,
        from: voterAddress,
        status: Status.Pending
    } as Transaction)

    return new ActionResult<State>()
        .setState(context.state)
}

@action(TriggerType.Transaction)
export function confirmTransaction(context: ContextWithTransactionAndParams<State, ConfirmationParams>): ActionResult<State> {
    const transactionId = context.arguments;
    assert(context.state.transactions.has(context.arguments.transactionId), "transaction id does not exists");

    const transaction = context.state.transactions.get(context.arguments.transactionId)

    const voterAddress = context.transaction.genesis
    
    const voterSet = new VoterSet(context.state.voters)
    assert(voterSet.has(voterAddress), "not authorized")
    
    if (voterSet.size > 1) {
        assert(!transaction.alreadyVoted(voterAddress), "already voted");
        assert(!Address.compare(transaction.from, voterAddress), "emitter cannot confirm")
    }

    let result = new ActionResult<State>()

    if(transaction.isThresholdReach(context.state.confirmationThreshold)) {
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
        transaction.status = Status.Done
        transaction.confirmations.push(context.transaction.address)
        transaction.snapshotTransaction = context.contract.address;
        transaction.txData = null;
        transaction.setup = null;
        newState.transactions.set(context.arguments.transactionId, transaction)
        result.setState(newState)
    }
    else {
        const newState = context.state
        transaction.confirmations.push(context.transaction.address)
        newState.transactions.set(context.arguments.transactionId, transaction)
        result.setState(newState)
    }
    
    return result
}

@publicFunction()
export function getTransactionDetails(context: ContextWithParams<State, u64>): Transaction | null{
    if(!context.state.transactions.has(context.arguments)) return null
    return context.state.transactions.get(context.arguments)
}

@publicFunction()
export function getState(context: Context<State>): State {
    return context.state
}