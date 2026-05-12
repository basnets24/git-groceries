INSERT INTO `User` (Username, PasswordHash, Email, Role)
VALUES
    ('gingertea',    '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'sneha.basnet@sjsu.edu',    'CUSTOMER'),
    ('kaizansatta',  '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'kaizan.satta@sjsu.edu',    'CUSTOMER'),
    ('anshhh',       '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'ansh.dhakalia@sjsu.edu',   'CUSTOMER'),
    ('victoriavo22', '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'victoria.vo@sjsu.edu',     'EMPLOYEE'),
    ('therealjohn',  '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'andy.t.van@sjsu.edu',      'MANAGER'),
    ('diyaa',        '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'diya.dalal@sjsu.edu',      'EMPLOYEE'),
    ('ofsadmin',     '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'admin@ofs.local',          'SUPERADMIN'),
    ('mia_nguyen',   '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'mia.nguyen@sjsu.edu',      'CUSTOMER'),
    ('carlos_m',     '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'carlos.m@sjsu.edu',        'CUSTOMER'),
    ('sara_p',       '$2b$12$p2uwRjXA5CMI8fpMUGsP/.Gr.vYTsK5CcQt..dxtqPHvTpZZACjia', 'sara.p@sjsu.edu',          'CUSTOMER');

INSERT INTO ProductCategory (Name, Description)
VALUES
    ('Fresh Produce', 'Fruits & farm-fresh vegetables'),
    ('Deli Meats',    'Premium quality deli meats'),
    ('Dairy',         'Milk, cheese & eggs'),
    ('Bakery',        'Fresh baked breads & pastries'),
    ('Beverages',     'Juices, drinks & more');

INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, ImageURL, IsActive)
VALUES
    -- Fresh Produce
    ('Bananas Bunch',                      1.99,  2.50, 1, '/images/banana-bunch.jpg',       TRUE),
    ('Gala Apples Bag',                    4.99,  3.00, 1, '/images/gala-apples.jpg',        TRUE),
    ('Broccoli Crown',                     2.49,  0.75, 1, '/images/broccoli-crown.jpg',     TRUE),
    ('Roma Tomatoes Pack',                 3.49,  1.50, 1, '/images/roma-tomatoes.jpg',      TRUE),

    -- Deli Meats
    ('Sliced Turkey Breast',               7.99,  1.00, 2, '/images/sliced-turkey.jpg',      TRUE),
    ('Honey Ham',                          6.99,  1.00, 2, '/images/honey-ham.jpg',          TRUE),
    ('Roast Beef Deli Meat',               8.99,  1.00, 2, '/images/roast-beef.jpg',         TRUE),

    -- Dairy
    ('Sliced American Cheese Pack',        3.99,  0.50, 3, '/images/american-cheese.jpg',    TRUE),
    ('Whole Milk Gallon',                  4.49,  8.60, 3, '/images/milk.jpg',               TRUE),
    ('Large Eggs Dozen',                   3.29,  1.50, 3, '/images/eggs.jpg',               TRUE),

    -- Bakery
    ('Blueberry Muffins',        7.99,  1.95, 4, '/images/blueberry-muffins.jpg',  TRUE),
    ('Multigrain Sandwich Bread Loaf',     6.99,  1.45, 4, '/images/multigrain-loaf.jpg',    TRUE),
    ('Sourdough Loaf',                     5.85,  1.35, 4, '/images/sourdough.jpg',          TRUE),
    ('Chocolate Chip Cookies',  7.99,  0.75, 4, '/images/cookies.jpg',            TRUE),

    -- Beverages
    ('Orange Soda',                        2.49,  0.75, 5, '/images/orange-soda.jpg',        TRUE),
    ('Pepsi Soda',                         2.49,  0.75, 5, '/images/pepsi.jpg',              FALSE),
    ('Coke Soda',                          2.49,  0.75, 5, '/images/coca-cola.jpg',          TRUE),
    ('Apple Juice',                        7.85,  8.30, 5, '/images/apple-juice.jpg',        TRUE);

INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty)
VALUES
    (1,  120, 0),
    (2,   80, 1),
    (3,   60, 0),
    (4,   75, 2),
    (5,   40, 0),
    (6,   35, 0),
    (7,   30, 1),
    (8,   50, 0),
    (9,   45, 0),
    (10,  70, 0),
    (11,   3, 0),
    (12,  80, 0),
    (13,  60, 0),
    (14,  75, 0),
    (15,  40, 0),
    (16,   0, 0),
    (17,  30, 0),
    (18,  30, 0);

-- Orders 1-2: PAID (pending dispatch)
-- Order 3:   INPROGRESS (active cart, no payment yet)
-- Orders 4-5: DELIVERED (past orders with completed trip)
-- Order 6:   DISPATCHED (robot currently in transit)
-- Orders 7-8: PAID (pending dispatch, newer batch)
-- Orders 9-11: DELIVERED past orders for users 1, 2, 3 (order history)
INSERT INTO ShoppingOrder (UserID, Street, City, State, Zip, Status, ReadyForDispatchAt)
VALUES
    (1, '123 Maple St',   'San Jose',   'CA', '95112', 'PAID',       '2026-04-24 09:15:00'),
    (2, '456 Willow Ave', 'San Jose',   'CA', '95126', 'PAID',       '2026-04-24 10:05:00'),
    (3, '789 Cedar Dr',   'Santa Clara','CA', '95050', 'INPROGRESS',  NULL),
    (8, '321 Oak Blvd',   'San Jose',   'CA', '95128', 'DELIVERED',  '2026-03-10 09:00:00'),
    (9, '654 Pine St',    'Milpitas',   'CA', '95035', 'DELIVERED',  '2026-03-11 10:00:00'),
    (10,'987 Elm Way',    'Campbell',   'CA', '95008', 'DISPATCHED', '2026-04-26 08:00:00'),
    (1, '123 Maple St',   'San Jose',   'CA', '95112', 'PAID',       '2026-04-26 07:30:00'),
    (2, '456 Willow Ave', 'San Jose',   'CA', '95126', 'PAID',       '2026-04-26 08:45:00'),
    (1, '123 Maple St',   'San Jose',   'CA', '95112', 'DELIVERED',  '2026-02-15 08:50:00'),
    (2, '456 Willow Ave', 'San Jose',   'CA', '95126', 'DELIVERED',  '2026-02-15 09:10:00'),
    (3, '789 Cedar Dr',   'Santa Clara','CA', '95050', 'DELIVERED',  '2026-02-15 09:30:00');

INSERT INTO ShoppingOrderItem (ShoppingOrderID, ProductID, Quantity, PriceAtCheckout, WeightAtCheckout)
VALUES
    -- Order 1 (gingertea, PAID)
    (1,  1, 2, 1.99, 2.50),
    (1,  9, 1, 4.49, 8.60),
    (1, 10, 1, 3.29, 1.50),

    -- Order 2 (kaizansatta, PAID)
    (2,  5, 1, 7.99, 1.00),
    (2,  6, 1, 6.99, 1.00),
    (2,  8, 1, 3.99, 0.50),

    -- Order 3 (anshhh, INPROGRESS cart)
    (3,  2, 1, 4.99, 3.00),
    (3,  4, 2, 3.49, 1.50),
    (3,  7, 1, 8.99, 1.00),

    -- Order 4 (mia_nguyen, DELIVERED)
    (4,  3, 1, 2.49, 0.75),
    (4,  1, 2, 1.99, 2.50),
    (4, 18, 1, 7.85, 8.30),

    -- Order 5 (carlos_m, DELIVERED)
    (5,  5, 1, 7.99, 1.00),
    (5, 12, 1, 6.99, 1.45),
    (5,  8, 1, 3.99, 0.50),

    -- Order 6 (sara_p, DISPATCHED)
    (6,  4, 2, 3.49, 1.50),
    (6,  9, 1, 4.49, 8.60),
    (6, 13, 1, 5.85, 1.35),

    -- Order 7 (gingertea second order, PAID)
    (7,  2, 1, 4.99, 3.00),
    (7, 10, 1, 3.29, 1.50),
    (7, 14, 1, 7.99, 0.75),

    -- Order 8 (kaizansatta second order, PAID)
    (8, 11, 1, 7.99, 1.95),
    (8, 17, 2, 2.49, 0.75),
    (8, 15, 1, 2.49, 0.75),

    -- Order 9 (gingertea, DELIVERED — past order)
    (9, 13, 1, 5.85, 1.35),
    (9, 17, 2, 2.49, 0.75),
    (9,  4, 1, 3.49, 1.50),

    -- Order 10 (kaizansatta, DELIVERED — past order)
    (10,  6, 1, 6.99, 1.00),
    (10, 10, 1, 3.29, 1.50),
    (10,  9, 1, 4.49, 8.60),

    -- Order 11 (anshhh, DELIVERED — past order)
    (11,  2, 1, 4.99, 3.00),
    (11,  3, 1, 2.49, 0.75),
    (11, 11, 1, 7.99, 1.95);

INSERT INTO Payment (ShoppingOrderID, Provider, ProviderRef, Amount, OccurredAt, Status)
VALUES
    (1, 'Stripe', 'ch_7A81KD2', 11.76, '2026-04-24 09:14:22', 'SUCCESS'),
    (2, 'Stripe', 'ch_7A81KD3', 18.97, '2026-04-24 10:04:10', 'SUCCESS'),
    (3, 'Stripe', 'ch_7A81KD4', 20.96, '2026-04-24 11:02:45', 'PENDING'),
    (4, 'Stripe', 'ch_7A81KD5', 14.32, '2026-03-10 08:59:50', 'SUCCESS'),
    (5, 'Stripe', 'ch_7A81KD6', 18.97, '2026-03-11 09:58:30', 'SUCCESS'),
    (6, 'Stripe', 'ch_7A81KD7', 17.32, '2026-04-26 07:58:00', 'SUCCESS'),
    (7, 'Stripe', 'ch_7A81KD8', 16.27, '2026-04-26 07:29:00', 'SUCCESS'),
    (8, 'Stripe', 'ch_7A81KD9', 15.46, '2026-04-26 08:44:00', 'SUCCESS'),
    (9, 'Stripe', 'ch_7A81KE0', 14.32, '2026-02-15 08:49:00', 'SUCCESS'),
    (10,'Stripe', 'ch_7A81KE1', 14.77, '2026-02-15 09:09:00', 'SUCCESS'),
    (11,'Stripe', 'ch_7A81KE2', 15.47, '2026-02-15 09:29:00', 'SUCCESS');

-- Trip 1: COMPLETED multi-stop trip (orders 4 & 5, March delivery run)
-- Trip 2: INPROGRESS single-stop trip (order 6, today's dispatch)
-- Trip 3: COMPLETED multi-stop trip (orders 9, 10, 11 — February delivery run)
INSERT INTO DeliveryTrip (Status, OriginAddress, DestinationAddress, OriginLat, OriginLng, DestLat, DestLng, DistanceM, DurationSec, StartedAt)
VALUES
    (
        'COMPLETED',
        'San Jose State University Charles W. Davidson College of Engineering, 1 Washington Sq, San Jose, CA 95192',
        '654 Pine St, Milpitas, CA 95035',
        37.3352000, -121.8811000,
        37.4320000, -121.8990000,
        19300, 1680,
        '2026-03-10 09:30:00'
    ),
    (
        'INPROGRESS',
        'San Jose State University Charles W. Davidson College of Engineering, 1 Washington Sq, San Jose, CA 95192',
        '987 Elm Way, Campbell, CA 95008',
        37.3352000, -121.8811000,
        37.2872000, -121.9400000,
        11200, 900,
        '2026-04-26 08:30:00'
    ),
    (
        'COMPLETED',
        'San Jose State University Charles W. Davidson College of Engineering, 1 Washington Sq, San Jose, CA 95192',
        '789 Cedar Dr, Santa Clara, CA 95050',
        37.3352000, -121.8811000,
        37.3541000, -121.9552000,
        16800, 1320,
        '2026-02-15 09:00:00'
    );

INSERT INTO TripStop (DeliveryTripID, ShoppingOrderID, StopIndex, ETA)
VALUES
    -- Trip 1: completed multi-stop (Oak Blvd first, then Milpitas)
    (1, 4, 0, '2026-03-10 10:00:00'),
    (1, 5, 1, '2026-03-10 10:30:00'),
    -- Trip 2: in-transit to Campbell
    (2, 6, 0, '2026-04-26 08:45:00'),
    -- Trip 3: completed February run (Maple St → Willow Ave → Cedar Dr)
    (3,  9, 0, '2026-02-15 09:15:00'),
    (3, 10, 1, '2026-02-15 09:30:00'),
    (3, 11, 2, '2026-02-15 09:50:00');

INSERT INTO CustomerAddress (UserID, Label, StreetLine1, StreetLine2, City, State, PostalCode, DeliveryInstructions, IsDefault)
VALUES
    (1, 'Home',   '123 Maple St',   NULL,      'San Jose',   'CA', '95112', 'Leave at front door',    TRUE),
    (2, 'Home',   '456 Willow Ave', 'Apt 5B',  'San Jose',   'CA', '95126', 'Buzz #203',              TRUE),
    (3, 'Home',   '789 Cedar Dr',   NULL,      'Santa Clara','CA', '95050', 'Ring doorbell twice',    TRUE),
    (8, 'Home',   '321 Oak Blvd',   NULL,      'San Jose',   'CA', '95128', 'Leave at side gate',     TRUE),
    (9, 'Home',   '654 Pine St',    'Unit 2',  'Milpitas',   'CA', '95035', NULL,                     TRUE),
    (10,'Home',   '987 Elm Way',    NULL,      'Campbell',   'CA', '95008', 'Text on arrival',        TRUE),
    (1, 'Work',   '1 Washington Sq',NULL,      'San Jose',   'CA', '95192', 'Deliver to front desk',  FALSE),
    (2, 'Office', '300 S 1st St',   'Ste 200', 'San Jose',   'CA', '95113', NULL,                     FALSE);

INSERT INTO CustomerProfile (UserID, DefaultAddressID, SubstitutionPreference, Notes)
VALUES
    (1, 1, 'No substitutions',        'Prefers organic where possible'),
    (2, 2, 'Allow close substitutes', NULL),
    (3, 3, 'Contact me first',        'Allergic to peanuts'),
    (8, 4, 'Allow close substitutes', 'Prefers low-sodium options'),
    (9, 5, 'No substitutions',        NULL),
    (10,6, 'Contact me first',        'Vegetarian — no meat products');

INSERT INTO CustomerPreference (UserID, PreferenceType, PreferenceValue, Source)
VALUES
    (1,  'DIET',          'VEGAN',    'USER'),
    (1,  'CATEGORY',      'ORGANIC',  'USER'),
    (2,  'BRAND_AVOID',   'BrandX',   'USER'),
    (3,  'ALLERGEN_AVOID','PEANUT',   'USER'),
    (8,  'DIET',          'LOW_SODIUM','USER'),
    (9,  'CATEGORY',      'DELI',     'USER'),
    (10, 'DIET',          'VEGETARIAN','USER'),
    (10, 'ALLERGEN_AVOID','MEAT',     'USER');

-- Delivery fleet: 10 robots all co-located at the SJSU Engineering Building
INSERT INTO Robot (RobotID, Label, CurrentLat, CurrentLng) VALUES
    (1,  'Robot #1',  37.3352000, -121.8811000),
    (2,  'Robot #2',  37.3352000, -121.8811000),
    (3,  'Robot #3',  37.3352000, -121.8811000),
    (4,  'Robot #4',  37.3352000, -121.8811000),
    (5,  'Robot #5',  37.3352000, -121.8811000),
    (6,  'Robot #6',  37.3352000, -121.8811000),
    (7,  'Robot #7',  37.3352000, -121.8811000),
    (8,  'Robot #8',  37.3352000, -121.8811000),
    (9,  'Robot #9',  37.3352000, -121.8811000),
    (10, 'Robot #10', 37.3352000, -121.8811000);
