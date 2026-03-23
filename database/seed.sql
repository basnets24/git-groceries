INSERT INTO `User` (Username, PasswordHash, Email, Role)
VALUES
    ('gingertea', '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'sneha.basnet@sjsu.edu', 'CUSTOMER'),
    ('kaizansatta', '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'kaizan.satta@sjsu.edu', 'CUSTOMER'),
    ('anshhh', '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'ansh.dhakalia@sjsu.edu', 'CUSTOMER'),
    ('victoriavo22', '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'victoria.vo@sjsu.edu', 'EMPLOYEE'),
    ('therealjohn', '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'andy.t.van@sjsu.edu', 'MANAGER'),
    ('diyaa', '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'diya.dalal@sjsu.edu', 'EMPLOYEE'),
    ('ofsadmin', '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'admin@ofs.local', 'SUPERADMIN');

INSERT INTO ProductCategory (Name)
VALUES
    ('Fresh Produce'),
    ('Deli Meats'),
    ('Dairy');

INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, isActive)
VALUES
    -- Fresh Produce
    ('Bananas Bunch', 1.99, 2.50, 1, TRUE),
    ('Gala Apples Bag', 4.99, 3.00, 1, TRUE),
    ('Broccoli Crown', 2.49, 0.75, 1, TRUE),
    ('Roma Tomatoes Pack', 3.49, 1.50, 1, TRUE),

    -- Deli Meats
    ('Sliced Turkey Breast', 7.99, 1.00, 2, TRUE),
    ('Honey Ham', 6.99, 1.00, 2, TRUE),
    ('Roast Beef Deli Meat', 8.99, 1.00, 2, TRUE),

    -- Dairy
    ('Sliced American Cheese Pack', 3.99, 0.50, 3, TRUE),
    ('Whole Milk Gallon', 4.49, 8.60, 3, TRUE),
    ('Large Eggs Dozen', 3.29, 1.50, 3, TRUE);

INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty)
VALUES
    (1, 120, 4),
    (2, 80, 2),
    (3, 60, 3),
    (4, 75, 1),
    (5, 40, 2),
    (6, 35, 1),
    (7, 30, 2),
    (8, 50, 2),
    (9, 45, 1),
    (10, 70, 4);

INSERT INTO ShoppingOrder (UserID, Street, City, State, Zip, Status)
VALUES
    (1, '123 Maple St', 'San Jose', 'CA', '95112', 'COMPLETED'),
    (2, '456 Willow Ave', 'San Jose', 'CA', '95126', 'COMPLETED'),
    (3, '789 Cedar Dr', 'Santa Clara', 'CA', '95050', 'INPROGRESS');

INSERT INTO ShoppingOrderItem (ShoppingOrderID, ProductID, Quantity, PriceAtCheckout, WeightAtCheckout)
VALUES
    -- Order 1
    (1, 1, 2, 1.99, 2.50),
    (1, 9, 1, 4.49, 8.60),
    (1, 10, 1, 3.29, 1.50),

    -- Order 2
    (2, 5, 1, 7.99, 1.00),
    (2, 6, 1, 6.99, 1.00),
    (2, 8, 1, 3.99, 0.50),

    -- Order 3
    (3, 2, 1, 4.99, 3.00),
    (3, 4, 2, 3.49, 1.50),
    (3, 7, 1, 8.99, 1.00);

INSERT INTO Payment (ShoppingOrderID, Provider, ProviderRef, Amount, OccurredAt, Status)
VALUES
    (1, 'Stripe', 'ch_7A81KD2', 11.76, '2026-03-08 10:14:22', 'SUCCESS'),
    (2, 'Stripe', 'ch_7A81KD3', 18.97, '2026-03-08 11:32:10', 'SUCCESS'),
    (3, 'Stripe', 'ch_7A81KD4', 20.96, '2026-03-09 09:02:45', 'PENDING');

INSERT INTO DeliveryTrip (Status)
VALUES
    ('COMPLETED'),
    ('INPROGRESS'),
    ('NOTSTARTED');

INSERT INTO TripStop (DeliveryTripID, ShoppingOrderID, StopIndex, ETA)
VALUES
    (1, 1, 1, '2026-03-08 12:00:00'),
    (1, 2, 2, '2026-03-08 12:20:00'),
    (2, 3, 1, '2026-03-09 10:30:00');

INSERT INTO CustomerAddress (UserID, Label, StreetLine1, StreetLine2, City, State, PostalCode, DeliveryInstructions, IsDefault)
VALUES
    (1, 'Home', '123 Maple St', NULL, 'San Jose', 'CA', '95112', 'Leave at front door', TRUE),
    (2, 'Home', '456 Willow Ave', 'Apt 5B', 'San Jose', 'CA', '95126', 'Buzz #203', TRUE),
    (3, 'Home', '789 Cedar Dr', NULL, 'Santa Clara', 'CA', '95050', 'Ring doorbell twice', TRUE);

INSERT INTO CustomerProfile (UserID, DefaultAddressID, SubstitutionPreference, Notes)
VALUES
    (1, 1, 'No substitutions', 'Prefers organic where possible'),
    (2, 2, 'Allow close substitutes', NULL),
    (3, 3, 'Contact me first', 'Allergic to peanuts');

INSERT INTO CustomerPreference (UserID, PreferenceType, PreferenceValue, Source)
VALUES
    (1, 'DIET', 'VEGAN', 'USER'),
    (1, 'CATEGORY', 'ORGANIC', 'USER'),
    (2, 'BRAND_AVOID', 'BrandX', 'USER'),
    (3, 'ALLERGEN_AVOID', 'PEANUT', 'USER');
