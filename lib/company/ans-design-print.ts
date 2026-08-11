/**
 * Identité légale & coordonnées ANS Design Print
 * Source : papier à en-tête facture / proforma (2026).
 * Backoffice / documents commerciaux consomment cette constante.
 */
export const ANS_DESIGN_PRINT = {
  name: 'ANS Design Print',
  legalName: 'A.N.S Design Print',
  tagline: 'ANS ORION — Print Studio ERP',
  slogan: '« Vouloir la différence »',
  address: 'Antananarivo, Madagascar',
  email: 'ans.designprint.annexe@gmail.com',
  tel: '+261 34 23 856 31',
  whatsapp: '+261 34 63 242 72',
  nif: '5 007 757 659',
  stat: '13135 11 2023 0 05107',
  rcs: 'Antananarivo 2024 A 00838',
  payment: {
    mobileMoney: [
      { label: 'MVola (Telma)', number: '033 11 328 66' },
      { label: 'Airtel Money', number: '037 45 001 97' },
      { label: 'Orange Money', number: '034 63 242 72' },
    ],
    mobileMoneyBeneficiary: 'A. Nambinintsoa Sarobidy',
    chequePayableTo: 'A.N.S Design Print',
    bankName: 'MCB',
    rib: '00006 | 00001 | 00000840327 82',
  },
} as const;

export type AnsDesignPrintCompany = typeof ANS_DESIGN_PRINT;
