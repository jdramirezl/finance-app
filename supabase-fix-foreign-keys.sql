-- Fix foreign key constraints to prevent cascade deletion of movements
-- This allows movements to remain when accounts/pockets are deleted (orphaned movements)

-- Drop existing foreign key constraints
ALTER TABLE movements 
DROP CONSTRAINT IF EXISTS movements_account_id_fkey;

ALTER TABLE movements 
DROP CONSTRAINT IF EXISTS movements_pocket_id_fkey;

-- Recreate foreign keys with NO ACTION (prevents cascade delete)
ALTER TABLE movements
ADD CONSTRAINT movements_account_id_fkey 
FOREIGN KEY (account_id) 
REFERENCES accounts(id) 
ON DELETE NO ACTION;

ALTER TABLE movements
ADD CONSTRAINT movements_pocket_id_fkey 
FOREIGN KEY (pocket_id) 
REFERENCES pockets(id) 
ON DELETE NO ACTION;

-- Note: This will prevent deletion of accounts/pockets that have movements
-- Our application code handles this by marking movements as orphaned first
