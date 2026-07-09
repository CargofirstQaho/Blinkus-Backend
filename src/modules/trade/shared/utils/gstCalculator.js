export const INDIAN_STATES = [
  { name: 'Jammu and Kashmir',              code: '01' },
  { name: 'Himachal Pradesh',               code: '02' },
  { name: 'Punjab',                         code: '03' },
  { name: 'Chandigarh',                     code: '04' },
  { name: 'Uttarakhand',                    code: '05' },
  { name: 'Haryana',                        code: '06' },
  { name: 'Delhi',                          code: '07' },
  { name: 'Rajasthan',                      code: '08' },
  { name: 'Uttar Pradesh',                  code: '09' },
  { name: 'Bihar',                          code: '10' },
  { name: 'Sikkim',                         code: '11' },
  { name: 'Arunachal Pradesh',              code: '12' },
  { name: 'Nagaland',                       code: '13' },
  { name: 'Manipur',                        code: '14' },
  { name: 'Mizoram',                        code: '15' },
  { name: 'Tripura',                        code: '16' },
  { name: 'Meghalaya',                      code: '17' },
  { name: 'Assam',                          code: '18' },
  { name: 'West Bengal',                    code: '19' },
  { name: 'Jharkhand',                      code: '20' },
  { name: 'Odisha',                         code: '21' },
  { name: 'Chhattisgarh',                   code: '22' },
  { name: 'Madhya Pradesh',                 code: '23' },
  { name: 'Gujarat',                        code: '24' },
  { name: 'Daman and Diu',                  code: '25' },
  { name: 'Dadra and Nagar Haveli',         code: '26' },
  { name: 'Maharashtra',                    code: '27' },
  { name: 'Andhra Pradesh (Old)',           code: '28' },
  { name: 'Karnataka',                      code: '29' },
  { name: 'Goa',                            code: '30' },
  { name: 'Lakshadweep',                    code: '31' },
  { name: 'Kerala',                         code: '32' },
  { name: 'Tamil Nadu',                     code: '33' },
  { name: 'Puducherry',                     code: '34' },
  { name: 'Andaman and Nicobar Islands',    code: '35' },
  { name: 'Telangana',                      code: '36' },
  { name: 'Andhra Pradesh',                 code: '37' },
  { name: 'Ladakh',                         code: '38' },
];

export function getStateCode(name) {
  const state = INDIAN_STATES.find((s) => s.name === name);
  return state ? state.code : null;
}

export function computeSupplyType(orgGstNumber, placeOfSupply) {
  const orgCode = (orgGstNumber || '').slice(0, 2);
  if (!orgCode) return 'INTRA';

  const placeCode = getStateCode(placeOfSupply);
  if (!placeCode) return 'INTRA';

  return orgCode === placeCode ? 'INTRA' : 'INTER';
}

export function computeLineItemTax(qty, price, taxPercent) {
  const q   = parseFloat(qty)        || 0;
  const p   = parseFloat(price)      || 0;
  const t   = parseFloat(taxPercent) || 0;
  const base = q * p;
  const taxAmount = base * (t / 100);
  return { base, taxAmount, total: base + taxAmount };
}

export function splitGstByType(totalTax, supplyType) {
  if (supplyType === 'INTRA') {
    return { cgst: totalTax / 2, sgst: totalTax / 2, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: totalTax };
}

export function resolveOverridable(rawValue, computedValue) {
  return rawValue !== undefined && rawValue !== null && rawValue !== ''
    ? (parseFloat(rawValue) || 0)
    : computedValue;
}

export function computeGstSummary({ currency, orgGstNumber, placeOfSupply, totalTax }) {
  if ((currency || '').toUpperCase() !== 'INR') {
    return { cgst: 0, sgst: 0, igst: 0, supplyType: null };
  }
  const supplyType = computeSupplyType(orgGstNumber, placeOfSupply);
  return { ...splitGstByType(totalTax, supplyType), supplyType };
}
