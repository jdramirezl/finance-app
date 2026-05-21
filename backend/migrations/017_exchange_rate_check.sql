-- Prevent rate poisoning: exchange rates must be positive.
-- A zero or negative rate would cause division-by-zero errors in currency conversion
-- and produce nonsensical financial calculations.

ALTER TABLE exchange_rates
ADD CONSTRAINT exchange_rates_rate_positive CHECK (rate > 0);
