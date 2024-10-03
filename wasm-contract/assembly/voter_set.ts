import { Address } from "@archethicjs/ae-contract-as"

export class VoterSet {
  set: Set<string> = new Set<string>()
  constructor(voters: Address[]) {
      for(let i = 0; i < voters.length; i++) {
          // Formalize case
          this.set.add(new Address(voters[i].hex).hex)
      }
  }

  has(address: Address): bool {
      return this.set.has(address.hex)
  }

  add(address: Address): void {
    this.set.add(address.hex)
  }

  delete(address: Address): void {
    this.set.delete(address.hex)
  }

  get size(): u32 { return this.set.size as u32}

  toAddressList(): Address[] {
    let addresses: Address[] = [];
    let hexAddresses = this.set.values()
    for(let i = 0; i < hexAddresses.length; i++) {
      addresses[i] = new Address(hexAddresses[i])
    }
    return addresses;
  }
}
