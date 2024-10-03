import { describe, expect, run, it } from "as-test";
import { Address, ContextWithTransaction, JSON, PublicKey, TransactionType } from "@archethicjs/ae-contract-as";

import { InitParams } from "../params";
import { State } from "../state"
import { onInit } from "..";

describe("onInit", () => {
  it("should initialize the state", () => {
      const initState = onInit({
          contract: {
              address: new Address("00"),
              genesis: new Address("00"),
              data: {},
              type: TransactionType.Contract
          },
          transaction: {
              data: { content: JSON.stringify<InitParams>({ voters: [ new Address("0000") ]} as InitParams) },
              type: TransactionType.Contract,
              previousPublicKey: new PublicKey("00"),
              genesis: new Address("00"),
              address: new Address("00")
          },
          now: 10209120,
          state: new State([], 1)
      } as ContextWithTransaction<State>)
      
    expect(initState.voters).toHaveLength(1)
    expect(Address.compare(initState.voters[0], new Address("0000"))).toBe(true)
  })
})

run()