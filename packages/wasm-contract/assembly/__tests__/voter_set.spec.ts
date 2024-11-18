import { describe, expect, run, it } from "as-test";
import { Address, JSON } from "@archethicjs/ae-contract-as";

import { VoterSet } from "../voter_set";

describe("new VoterSet()", () => {
    it("should create a set form a list of addresses", () => {
        const set = new VoterSet([
            new Address("123456"),
            new Address("9876")
        ])

        expect(set.size).toBe(2)
    })
})

describe("toAddressList", () => {
    it ("should return list of addresses from the set", () => {
        const set = new VoterSet([
            new Address("123456"),
            new Address("9876")
        ])

        const addressList = set.toAddressList()
        expect(addressList).toHaveLength(2)
        expect(Address.compare(addressList[0], new Address("123456"))).toBe(true)
        expect(Address.compare(addressList[1], new Address("9876"))).toBe(true)
    })
})

run()