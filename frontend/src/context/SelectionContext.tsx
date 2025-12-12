import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';

interface SelectionContextType {
    selectedItems: Map<string, number>;
    toggleSelection: (id: string, value: number) => void;
    clearSelection: () => void;
    isSelected: (id: string) => boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
    const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

    const toggleSelection = useCallback((id: string, value: number) => {
        setSelectedItems(prev => {
            const newMap = new Map(prev);
            if (newMap.has(id)) {
                newMap.delete(id);
            } else {
                newMap.set(id, value);
            }
            return newMap;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems(new Map());
    }, []);

    const isSelected = useCallback((id: string) => {
        return selectedItems.has(id);
    }, [selectedItems]);

    return (
        <SelectionContext.Provider value={{ selectedItems, toggleSelection, clearSelection, isSelected }}>
            {children}
        </SelectionContext.Provider>
    );
};

export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (context === undefined) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
};
