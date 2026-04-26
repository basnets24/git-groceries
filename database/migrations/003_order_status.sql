-- Replaces the ambiguous COMPLETED status with clearer values so the state
-- machine reads: INPROGRESS (cart) → PAID (payment confirmed) → DISPATCHED
-- (robot assigned) → DELIVERED (robot arrived).

ALTER TABLE ShoppingOrder
    MODIFY COLUMN Status
        ENUM('INPROGRESS','PAID','DISPATCHED','DELIVERED','REFUNDED','VOID')
        NOT NULL DEFAULT 'INPROGRESS';
