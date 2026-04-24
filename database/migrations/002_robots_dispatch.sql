-- Adds the robot fleet + dispatch-confirmation workflow for admins.

CREATE TABLE Robot (
    RobotID        INT PRIMARY KEY,
    Label          VARCHAR(50)     NOT NULL,
    Status         ENUM('IDLE','DISPATCHED','RETURNING','OFFLINE')
                    NOT NULL DEFAULT 'IDLE',
    CurrentLat     DECIMAL(10,7)   NOT NULL,
    CurrentLng     DECIMAL(10,7)   NOT NULL,
    CurrentTripID  INT             NULL,
    UpdatedAt      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE DeliveryTrip
    ADD COLUMN RobotID     INT       NULL AFTER DeliveryTripID,
    ADD COLUMN ConfirmedAt DATETIME  NULL AFTER StartedAt,
    ADD CONSTRAINT fk_deliverytrip_robot
        FOREIGN KEY (RobotID) REFERENCES Robot(RobotID)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

ALTER TABLE ShoppingOrder
    ADD COLUMN ReadyForDispatchAt DATETIME NULL AFTER Status;

-- Seed the fleet. All ten robots start co-located at the SJSU Engineering
-- Building (origin of every delivery trip).
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
