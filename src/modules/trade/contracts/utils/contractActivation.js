const SIGNED_CONTRACT_REQUIRED_FROM = new Date(process.env.SIGNED_CONTRACT_FEATURE_LAUNCH || Date.now());

export function isContractActive(contract) {
  if (!contract || contract.status !== 'FINALIZED') return false;
  if (contract.contractMode === 'UPLOAD') return true;
  if (contract.signedContract?.s3Key) return true;
  if (contract.generatedAt && new Date(contract.generatedAt) < SIGNED_CONTRACT_REQUIRED_FROM) return true;
  return false;
}

export function contractActivationStatus(contract) {
  if (!contract || contract.status !== 'FINALIZED') return 'DRAFT';
  if (isContractActive(contract)) return 'ACTIVE';
  return 'AWAITING_SIGNATURE';
}
