export type Currency = 'USD' | 'MXN' | 'COP' | 'EUR' | 'GBP';
export type PocketType = 'normal' | 'fixed';
export type MovementType = 'IngresoNormal' | 'EgresoNormal' | 'IngresoFijo' | 'EgresoFijo';
export interface Account {
    id: string;
    name: string;
    color: string;
    currency: Currency;
    balance: number;
    type?: 'normal' | 'investment';
    stockSymbol?: string;
    montoInvertido?: number;
    shares?: number;
    displayOrder?: number;
}
export interface Pocket {
    id: string;
    accountId: string;
    name: string;
    type: PocketType;
    balance: number;
    currency: Currency;
    displayOrder?: number;
}
export interface FixedExpenseGroup {
    id: string;
    name: string;
    color: string;
    createdAt: string;
    updatedAt?: string;
}
export interface SubPocket {
    id: string;
    pocketId: string;
    name: string;
    valueTotal: number;
    periodicityMonths: number;
    balance: number;
    enabled: boolean;
    groupId?: string;
    displayOrder?: number;
}
export interface Movement {
    id: string;
    type: MovementType;
    accountId: string;
    pocketId: string;
    subPocketId?: string;
    amount: number;
    notes?: string;
    displayedDate: string;
    createdAt: string;
    isPending?: boolean;
    isOrphaned?: boolean;
    orphanedAccountName?: string;
    orphanedAccountCurrency?: string;
    orphanedPocketName?: string;
}
export interface InvestmentAccount extends Account {
    type: 'investment';
    montoInvertido: number;
    shares: number;
    precioActual: number;
    gananciasUSD: number;
    gananciasPct: number;
}
export interface MovementTemplate {
    id: string;
    name: string;
    type: MovementType;
    accountId: string;
    pocketId: string;
    subPocketId?: string;
    defaultAmount?: number;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}
export interface Settings {
    primaryCurrency: Currency;
    alphaVantageApiKey?: string;
}
//# sourceMappingURL=index.d.ts.map