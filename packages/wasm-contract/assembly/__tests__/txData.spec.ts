import { describe, expect, run, it } from "as-test";
import { Address, JSON } from "@archethicjs/ae-contract-as";

import { TxData } from "../state";
import { Hero } from "./types";

describe("getTransactionBuilder", () => {
  it("should add uco transfers", () => {
    const txData = {
      ucoTransfers: [
        {
          to: new Address("0000"),
          amount: 100_000_000
        }
      ]
    } as TxData

    const txBuilder = txData.getTransactionBuilder()
    expect(txBuilder.ucoTransfers).toHaveLength(1)
    expect(Address.compare(txBuilder.ucoTransfers[0].to, new Address("0000"))).toBe(true)
    expect(txBuilder.ucoTransfers[0].amount).toBe(100_000_000)
  })

  it("should add token transfers", () => {
    const txData = {
      tokenTransfers: [
        {
          to: new Address("0000"),
          amount: 100_000_000,
          tokenAddress: new Address("baba")
        },
        {
          to: new Address("0000"),
          amount: 500_000,
          tokenAddress: new Address("1234"),
          tokenId: 3
        }
      ]
    } as TxData

    const txBuilder = txData.getTransactionBuilder()
    expect(txBuilder.tokenTransfers).toHaveLength(2)

    expect(Address.compare(txBuilder.tokenTransfers[0].to, new Address("0000"))).toBe(true)
    expect(txBuilder.tokenTransfers[0].amount).toBe(100_000_000)
    expect(Address.compare(txBuilder.tokenTransfers[0].tokenAddress, new Address("baba"))).toBe(true)
    expect(txBuilder.tokenTransfers[0].tokenId).toBe(0)

    expect(Address.compare(txBuilder.tokenTransfers[1].to, new Address("0000"))).toBe(true)
    expect(txBuilder.tokenTransfers[1].amount).toBe(500_000)
    expect(Address.compare(txBuilder.tokenTransfers[1].tokenAddress, new Address("1234"))).toBe(true)
    expect(txBuilder.tokenTransfers[1].tokenId).toBe(3)
  })

  it("should add recipients", () => {
    const txData = {
     recipients: [
      {
        address: new Address("0000"),
        action: "increment"
      },
      {
        address: new Address("5678"),
        action: "addHero",
        args: JSON.stringify<Hero>({ name: "John Doe" })
      }
     ]
    } as TxData

    const txBuilder = txData.getTransactionBuilder()
    expect(txBuilder.recipients).toHaveLength(2)
  })
})

run()