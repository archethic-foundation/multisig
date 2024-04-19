import { defineStore } from "pinia";

const LOCAL_STORAGE_KEY = "vaults";

function getVaults() {
  const vaults = localStorage.getItem(LOCAL_STORAGE_KEY);
  return vaults ? JSON.parse(vaults) : [];
}

function addVault(newVault) {
  let vaults = getVaults();
  vaults.push({ address: newVault });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vaults));
}

function removeVault(vaultAddress) {
  const newVaults = getVaults().filter((v) => v.address != vaultAddress);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newVaults));
}

function nameVault(vaultAddress, vaultName) {
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
