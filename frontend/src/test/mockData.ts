import type { Account, Pocket, SubPocket, Movement } from '../types';

export const mockAccounts: Account[] = [
    {
        id: 'acc-1',
        name: 'Bank Account',
        color: '#3B82F6',
        currency: 'USD',
        balance: 1000,
        type: 'normal',
    },
    {
        id: 'acc-2',
        name: 'Cash',
        color: '#10B981',
        currency: 'MXN',
        balance: 500,
        type: 'normal',
    },
    {
        id: 'acc-investment',
        name: 'VOO Investment',
        color: '#8B5CF6',
        currency: 'USD',
        balance: 5000,
        type: 'investment',
        stockSymbol: 'VOO',
        montoInvertido: 4500,
        shares: 10,
    },
];

export const mockPockets: Pocket[] = [
    {
        id: 'pocket-1',
        accountId: 'acc-1',
        name: 'Savings',
        type: 'normal',
        balance: 600,
        currency: 'USD',
    },
    {
        id: 'pocket-2',
        accountId: 'acc-1',
        name: 'Fixed Expenses',
        type: 'fixed',
        balance: 400,
        currency: 'USD',
    },
    {
        id: 'pocket-3',
        accountId: 'acc-2',
        name: 'Daily',
        type: 'normal',
        balance: 500,
        currency: 'MXN',
    },
];

export const mockSubPockets: SubPocket[] = [
    {
        id: 'subpocket-1',
        pocketId: 'pocket-2',
        name: 'Internet',
        valueTotal: 1200,
        periodicityMonths: 12,
        balance: 100,
        enabled: true,
    },
    {
        id: 'subpocket-2',
        pocketId: 'pocket-2',
        name: 'Insurance',
        valueTotal: 2400,
        periodicityMonths: 12,
        balance: 300,
        enabled: true,
    },
    {
        id: 'subpocket-3',
        pocketId: 'pocket-2',
        name: 'Gym',
        valueTotal: 600,
        periodicityMonths: 6,
        balance: 0,
        enabled: false,
    },
];

export const mockMovements: Movement[] = [
    {
        id: 'mov-1',
        type: 'IngresoNormal',
        accountId: 'acc-1',
        pocketId: 'pocket-1',
        amount: 500,
        notes: 'Salary',
        displayedDate: '2024-01-15T00:00:00.000Z',
        createdAt: '2024-01-15T10:30:00.000Z',
    },
    {
        id: 'mov-2',
        type: 'EgresoNormal',
        accountId: 'acc-1',
        pocketId: 'pocket-1',
        amount: 100,
        notes: 'Groceries',
        displayedDate: '2024-01-20T00:00:00.000Z',
        createdAt: '2024-01-20T14:20:00.000Z',
    },
    {
        id: 'mov-3',
        type: 'IngresoFijo',
        accountId: 'acc-1',
        pocketId: 'pocket-2',
        subPocketId: 'subpocket-1',
        amount: 100,
        notes: 'Monthly contribution',
        displayedDate: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T08:00:00.000Z',
    },
];
