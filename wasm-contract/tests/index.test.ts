import { describe, it, expect } from 'vitest'
import { readFileSync } from "fs";
import { Address, getContract, TransactionType, PublicKey, TransactionData } from "@archethicjs/ae-contract-test";
import { Utils, Crypto } from "@archethicjs/sdk/"

describe("onInit", () => {
    it("should initialize the state with transaction's content", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [ new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))) ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract)
        });

        expect(contract.state.voters.map(({ "hex": hex}) => new Address(hex))).toEqual(initialVoters);
    });
});

describe("proposeTransaction", () => {
    it("should update the state with new transaction in the maps of transactions", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [ new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))) ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract),
        });

        const incomingTx = generateTransaction("voter1", 0)
        contract.proposeTransaction({
            txData: { content: "hello" }
        }, {
            transaction: incomingTx
        })

        expect(contract.state.nextId).toEqual(1)
        expect(Object.keys(contract.state.transactions).length).toEqual(1)
        expect(contract.state.transactions["1"].txData.content).toEqual("hello")
        expect(contract.state.transactions["1"].originTx.hex).toStrictEqual(incomingTx.address.hex)
        expect(contract.state.transactions["1"].from.hex).toEqual(initialVoters[0].hex)
        expect(contract.state.transactions["1"].status).toEqual("pending")
    })

    it("should throw if the voter is not authorized", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [ new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))) ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract),
        })

        const incomingTx = generateTransaction("voter2", 0)
        expect(() => {
            contract.proposeTransaction({
                txData: { content: "hello" }
            }, {
                transaction: incomingTx
            })
        }).toThrowError("not authorized")
    })
})

describe("confirmTransaction", () => {
    it("should accumulate confirmation", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))),
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter2"))),
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter3")))
        ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters, confirmationThreshold: 2 }) }, TransactionType.Contract),
        });

        const proposeTx = generateTransaction("voter1", 0)
        contract.proposeTransaction({
            txData: { content: "hello" }
        }, {
            transaction: proposeTx
        })

        const confirmTx = generateTransaction("voter2", 0)
        const result = contract.confirmTransaction({ transactionId: 1}, { transaction: confirmTx })
        expect(contract.state.transactions["1"].confirmations.length).toBe(1)
        expect(contract.state.transactions["1"].confirmations[0].hex).toBe(confirmTx.address.hex)
        expect(contract.state.transactions["1"].status).toBe("pending")
    })

    it("should return transaction when threshold is reached", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))),
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter2"))),
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter3")))
        ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters, confirmationThreshold: 2 }) }, TransactionType.Contract),
        });

        const proposeTx = generateTransaction("voter1", 0)
        contract.proposeTransaction({
            txData: { content: "hello" }
        }, { 
            transaction: proposeTx
        })

        const confirmTx = generateTransaction("voter2", 0)
        contract.confirmTransaction({ transactionId: 1}, { transaction: confirmTx })
        expect(contract.state.transactions["1"].confirmations.length).toBe(1)
        expect(contract.state.transactions["1"].confirmations[0].hex).toBe(confirmTx.address.hex)
        expect(contract.state.transactions["1"].status).toBe("pending")

        const confirmTx2 = generateTransaction("voter3", 0)
        const result = contract.confirmTransaction({ transactionId: 1}, { transaction: confirmTx2 })
        expect(contract.state.transactions["1"].confirmations.length).toBe(2)
        expect(contract.state.transactions["1"].confirmations[1].hex).toBe(confirmTx2.address.hex)
        expect(contract.state.transactions["1"].status).toBe("done")


        expect(result?.transaction.data.content).toBe("hello")
    })

    it("should return an error if the transaction doesn't exists", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))),
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter2")))
        ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract),
        });

        expect(() => {
            const confirmTx = generateTransaction("voter1", 0)
            contract.confirmTransaction({ transactionId: 1}, { transaction: confirmTx })
        }).toThrowError("transaction id does not exists")
    })

    it("should return an error if the voter is not authorized", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))),
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter2")))
        ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract),
        });

        const proposeTx = generateTransaction("voter1", 0)
        contract.proposeTransaction({
            txData: { content: "hello" }
        }, { 
            transaction: proposeTx
        })

        expect(() => {
            const confirmTx = generateTransaction("voter3", 0)
            contract.confirmTransaction({ transactionId: 1}, { transaction: confirmTx })
        }).toThrowError("not authorized")
    })

    it("should return an error if the voter is the origin emitter", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))),
            new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter2")))
        ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract),
        });

        const proposeTx = generateTransaction("voter1", 0)
        contract.proposeTransaction({
            txData: { content: "hello" }
        }, { 
            transaction: proposeTx
        })

        expect(() => {
            const confirmTx = generateTransaction("voter1", 0)
            contract.confirmTransaction({ transactionId: 1}, { transaction: confirmTx })
        }).toThrowError("emitter cannot confirm")
    })
})

describe("getTransactionDetails", () => {
    it ("should return null if the transaction id doesn't exits", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [ new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))) ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract),
        });

        expect(contract.getTransactionDetails(1)).toBe(null)
    })

    it ("should return transaction details", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [ new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))) ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract),
        });

        const incomingTx = generateTransaction("voter1", 0)
        contract.proposeTransaction({
            txData: { content: "hello" }
        }, { 
            transaction: incomingTx
        })

        const tx: any = contract.getTransactionDetails(1)
        expect(tx.status).toBe("pending")
        expect(tx.txData.content).toBe("hello")
    })
})

describe("getState", () => {
    it ("should return contract state", async () => {
        const wasmBuffer = readFileSync("./dist/contract.wasm");

        const initialVoters = [ new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress("voter1"))) ]

        const contract = await getContract(wasmBuffer, {
            transaction: generateTransaction("contract", 0, { content: JSON.stringify({ voters: initialVoters }) }, TransactionType.Contract),
        });

        let state: any = contract.getState()
        expect(new Address(state.voters[0].hex)).toStrictEqual(initialVoters[0])
        expect(state.confirmationThreshold).toBe(1)

        const incomingTx = generateTransaction("voter1", 0)
        contract.proposeTransaction({
            txData: { content: "hello" }
        }, {
            transaction: incomingTx
        })

        state = contract.getState()
        expect(state.transactions["1"].txData.content).toBe("hello")
    })
})

function generateTransaction(seed: string, index: number, data: TransactionData = {}, type = TransactionType.Transfer) {
    return {
        genesis: new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress(seed, 0))),
        address: new Address(Utils.uint8ArrayToHex(Crypto.deriveAddress(seed, index + 1))),
        previousPublicKey: new Address(Utils.uint8ArrayToHex(Crypto.deriveKeyPair(seed, index).publicKey)),
        data: data,
        type: type
    } 
}
