import { defineStore } from "pinia";

const LOCAL_STORAGE_KEY = "vaults";

export interface Vault {
  address: string;
  name?: string;
}

function getVaults(): Vault[] {
  const vaults = localStorage.getItem(LOCAL_STORAGE_KEY);
  return vaults ? JSON.parse(vaults) : [];
}

function addVault(newVault: string): void {
  let vaults = getVaults();
  vaults.push({ address: newVault });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vaults));
}

function removeVault(vaultAddress: string): void {
  const newVaults = getVaults().filter((v) => v.address != vaultAddress);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newVaults));
}

function nameVault(vaultAddress: string, vaultName: string): void {
  const vaults = getVaults().map((v) => {
    if (v.address == vaultAddress) {
      v.name = vaultName;
    }
    return v;
  });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vaults));
}

export const useVaultStore = defineStore("vaults", () => {
  return {
    getVaults,
    addVault,
    removeVault,
    nameVault,
  };
});
