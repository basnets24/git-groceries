CREATE TABLE Customer (
    CustomerID      INT AUTO_INCREMENT PRIMARY KEY,

    Username        VARCHAR(50)     NOT NULL,
    PasswordHash    VARCHAR(100)    NOT NULL,
    Email           VARCHAR(100)    NOT NULL UNIQUE
);

CREATE TABLE Employee (
    EmployeeID      INT AUTO_INCREMENT PRIMARY KEY,

    Username        VARCHAR(50)     NOT NULL,
    PasswordHash    VARCHAR(100)    NOT NULL,
    Email           VARCHAR(100)    NOT NULL UNIQUE,
    Position        ENUM('EMPLOYEE', 'MANAGER') NOT NULL DEFAULT 'EMPLOYEE'
);

CREATE TABLE ProductCategory (
    ProductCategoryID INT AUTO_INCREMENT PRIMARY KEY,

    Name            VARCHAR(50) NOT NULL
);

CREATE TABLE Product (
    ProductID       INT AUTO_INCREMENT PRIMARY KEY,

    Name                VARCHAR(50)   NOT NULL,
    Price               DECIMAL(7,2)  NOT NULL,
    WeightLbs           DECIMAL(7,2)  NOT NULL, 
    ProductCategoryID   INT           NOT NULL,
    IsActive            BOOLEAN       NOT NULL DEFAULT TRUE, 

    FOREIGN KEY (ProductCategoryID) REFERENCES ProductCategory(ProductCategoryID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE Inventory (
    ProductID       INT NOT NULL PRIMARY KEY,

    QuantityInStock INT UNSIGNED    NOT NULL,
    ReservedQty     INT UNSIGNED    NOT NULL,

    FOREIGN KEY (ProductID) REFERENCES Product(ProductID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE ShoppingOrder (
    ShoppingOrderID     INT AUTO_INCREMENT PRIMARY KEY,
    
    CustomerID  INT             NOT NULL,
    Street      VARCHAR(100)    NOT NULL,
    City        VARCHAR(75)     NOT NULL,
    State       VARCHAR(2)      NOT NULL,
    Zip         VARCHAR(10)     NOT NULL,
    Status      ENUM('INPROGRESS', 'COMPLETED','REFUNDED','VOID') NOT NULL DEFAULT 'INPROGRESS',

    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE ShoppingOrderItem (
    ShoppingOrderID             INT NOT NULL,
    ProductID           INT NOT NULL,
    PRIMARY KEY (ShoppingOrderID, ProductID),

    Quantity      	    INT UNSIGNED  NOT NULL,
    PriceAtCheckout	    DECIMAL(7,2)  NOT NULL,
    WeightAtCheckout    DECIMAL(7,2)  NOT NULL,

    FOREIGN KEY (ShoppingOrderID) REFERENCES ShoppingOrder(ShoppingOrderID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Product(ProductID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE Payment (
    PaymentID   INT AUTO_INCREMENT PRIMARY KEY,

    ShoppingOrderID     INT             NOT NULL,
    Provider    VARCHAR(50)     NOT NULL,
    ProviderRef VARCHAR(100)    NOT NULL UNIQUE,
    Amount      DECIMAL(7,2)    NOT NULL,
    OccurredAt  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status      ENUM('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',

    FOREIGN KEY (ShoppingOrderID) REFERENCES ShoppingOrder(ShoppingOrderID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- note, tripstop and all delivery scheduling tables are works in progress
-- need to figure out implementation details to get a better idea of how
-- tables should be structured...

CREATE TABLE DeliveryTrip (
    DeliveryTripID  INT AUTO_INCREMENT PRIMARY KEY,

    Status  ENUM('NOTSTARTED', 'INPROGRESS','COMPLETED','ERROR') NOT NULL DEFAULT 'NOTSTARTED'
);

CREATE TABLE TripStop (
    DeliveryTripID  INT         NOT NULL,
    ShoppingOrderID     INT             NOT NULL,
    PRIMARY KEY (DeliveryTripID, ShoppingOrderID),

    StopIndex   INT NOT NULL,
    ETA         DATETIME,       
    -- did not include 'NOT NULL' for eta because we may need it to be null 
    -- while calculating/ recalculating delivery routes

    FOREIGN KEY (DeliveryTripID) REFERENCES DeliveryTrip(DeliveryTripID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (ShoppingOrderID) REFERENCES ShoppingOrder(ShoppingOrderID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);