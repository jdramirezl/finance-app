import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storageService';
import { mockAccounts, mockPockets, mockSubPockets, mockMovements } from '../test/mockData';

describe('StorageService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('Accounts', () => {
        it('should save and retrieve accounts', () => {
            StorageService.saveAccounts(mockAccounts);
            const retrieved = StorageService.getAccounts();
            expect(retrieved).toEqual(mockAccounts);
        });

        it('should return empty array when no accounts exist', () => {
            const accounts = StorageService.getAccounts();
            expect(accounts).toEqual([]);
        });
    });

    describe('Pockets', () => {
        it('should save and retrieve pockets', () => {
            StorageService.savePockets(mockPockets);
            const retrieved = StorageService.getPockets();
            expect(retrieved).toEqual(mockPockets);
        });

        it('should return empty array when no pockets exist', () => {
            const pockets = StorageService.getPockets();
            expect(pockets).toEqual([]);
        });
    });

    describe('SubPockets', () => {
        it('should save and retrieve subPockets', () => {
            StorageService.saveSubPockets(mockSubPockets);
            const retrieved = StorageService.getSubPockets();
            expect(retrieved).toEqual(mockSubPockets);
        });

        it('should return empty array when no subPockets exist', () => {
            const subPockets = StorageService.getSubPockets();
            expect(subPockets).toEqual([]);
        });
    });

    describe('Movements', () => {
        it('should save and retrieve movements', () => {
            StorageService.saveMovements(mockMovements);
            const retrieved = StorageService.getMovements();
            expect(retrieved).toEqual(mockMovements);
        });

        it('should return empty array when no movements exist', () => {
            const movements = StorageService.getMovements();
            expect(movements).toEqual([]);
        });
    });

    describe('Settings', () => {
        it('should save and retrieve settings', () => {
            const settings = { primaryCurrency: 'EUR' as const };
            StorageService.saveSettings(settings);
            const retrieved = StorageService.getSettings();
            expect(retrieved).toEqual(settings);
        });

        it('should return default settings when none exist', () => {
            const settings = StorageService.getSettings();
            expect(settings).toEqual({ primaryCurrency: 'USD' });
        });
    });
});
