import { describe, expect, run, it } from "as-test";
import { Address, JSON } from "@archethicjs/ae-contract-as";

import { Status, Transaction, TxData } from "../state";

describe("isThresholdReached", () => {
  it("should return true when the confirmation is -1 of the threshold", () => {
    const tx = new Transaction(new Address("0000"), new Address("1111"))
    expect(tx.isThresholdReached(1)).toBe(true)

    tx.confirm(new Address("0000"), new Address("1111"))
    expect(tx.isThresholdReached(2)).toBe(true)

    tx.confirm(new Address("1111"), new Address("2222"))
    expect(tx.isThresholdReached(3)).toBe(true)
  })

  it("should return false when the confirmation is less than -1 of the threshold", () => {
    const tx = new Transaction(new Address("0000"), new Address("1111"))
    tx.confirm(new Address("0000"), new Address("1111"))
    expect(tx.isThresholdReached(3)).toBe(false)
  })
})

describe("alreadyVoted", () => {
  it("should return true when the address is already in the confirmation address", () => {
    const tx = new Transaction(new Address("0000"), new Address("1111"))
    tx.confirm(new Address("00"), new Address("11"))
    expect(tx.alreadyVoted(new Address("00"))).toBe(true)
  })

  it("should return true when the address isn't already in the confirmation address", () => {
    const tx = new Transaction(new Address("0000"), new Address("1111"))
    expect(tx.alreadyVoted(new Address("00"))).toBe(false)

    tx.confirm(new Address("00"), new Address("11"))
    expect(tx.alreadyVoted(new Address("22"))).toBe(false)
  })
})

describe("seal", () => {
  it("should reset transaction and snapshot the transaction to mark as done", () => {
    const tx = new Transaction(new Address("0000"), new Address("1111"))
    const txData = new TxData()
    txData.content = "hello"
    tx.txData = txData

    tx.confirm(new Address("00"), new Address("00"))
    tx.seal(new Address("9999"))

    expect(tx.setup == null).toBe(true)
    expect(tx.txData == null).toBe(true)
    expect(tx.status).toBe(Status.Done)
    expect(Address.compare(tx.snapshotTransaction as Address, new Address("9999"))).toBe(true)
  })
})

run()