CREATE TABLE `User` (
    UserID        INT AUTO_INCREMENT PRIMARY KEY,

    Username      VARCHAR(50)     NOT NULL UNIQUE,
    PasswordHash  VARCHAR(100)    NOT NULL,
    Email         VARCHAR(100)    NOT NULL UNIQUE,
    Role          ENUM('CUSTOMER', 'EMPLOYEE', 'MANAGER', 'SUPERADMIN') NOT NULL DEFAULT 'CUSTOMER'
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
    ImageURL            VARCHAR(255)  NULL,
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
    
    UserID      INT             NOT NULL,
    Street      VARCHAR(100)    NOT NULL,
    City        VARCHAR(75)     NOT NULL,
    State       VARCHAR(2)      NOT NULL,
    Zip         VARCHAR(10)     NOT NULL,
    Status      ENUM('INPROGRESS', 'COMPLETED','REFUNDED','VOID') NOT NULL DEFAULT 'INPROGRESS',

    FOREIGN KEY (UserID) REFERENCES `User`(UserID)
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
    DeliveryTripID      INT AUTO_INCREMENT PRIMARY KEY,

    Status              ENUM('NOTSTARTED', 'INPROGRESS','COMPLETED','ERROR') NOT NULL DEFAULT 'NOTSTARTED',
    Polyline            TEXT,
    OriginAddress       VARCHAR(255),
    DestinationAddress  VARCHAR(255),
    OriginLat           DECIMAL(10,7),
    OriginLng           DECIMAL(10,7),
    DestLat             DECIMAL(10,7),
    DestLng             DECIMAL(10,7),
    DistanceM           INT,
    DurationSec         INT,
    StartedAt           DATETIME DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE CustomerAddress (
    CustomerAddressID     INT AUTO_INCREMENT PRIMARY KEY,
    UserID                INT NOT NULL,
    Label                 VARCHAR(50) NOT NULL,
    StreetLine1           VARCHAR(100) NOT NULL,
    StreetLine2           VARCHAR(100),
    City                  VARCHAR(75) NOT NULL,
    State                 VARCHAR(2) NOT NULL,
    PostalCode            VARCHAR(10) NOT NULL,
    DeliveryInstructions  VARCHAR(255),
    IsDefault             BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (UserID) REFERENCES `User`(UserID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE CustomerProfile (
    UserID                INT PRIMARY KEY,
    DefaultAddressID      INT,
    SubstitutionPreference VARCHAR(100),
    Notes                 TEXT,
    CreatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (UserID) REFERENCES `User`(UserID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (DefaultAddressID) REFERENCES CustomerAddress(CustomerAddressID)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE CustomerPreference (
    CustomerPreferenceID  INT AUTO_INCREMENT PRIMARY KEY,
    UserID                INT NOT NULL,
    PreferenceType        VARCHAR(50) NOT NULL,
    PreferenceValue       VARCHAR(255) NOT NULL,
    Source                VARCHAR(50),
    CreatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (UserID) REFERENCES `User`(UserID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
