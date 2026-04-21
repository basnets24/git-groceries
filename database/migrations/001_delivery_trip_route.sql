-- Adds route geometry + metadata columns to DeliveryTrip so admins can review
-- past delivery routes even after the backend process has restarted.

ALTER TABLE DeliveryTrip
    ADD COLUMN Polyline           TEXT            AFTER Status,
    ADD COLUMN OriginAddress      VARCHAR(255)    AFTER Polyline,
    ADD COLUMN DestinationAddress VARCHAR(255)    AFTER OriginAddress,
    ADD COLUMN OriginLat          DECIMAL(10,7)   AFTER DestinationAddress,
    ADD COLUMN OriginLng          DECIMAL(10,7)   AFTER OriginLat,
    ADD COLUMN DestLat            DECIMAL(10,7)   AFTER OriginLng,
    ADD COLUMN DestLng            DECIMAL(10,7)   AFTER DestLat,
    ADD COLUMN DistanceM          INT             AFTER DestLng,
    ADD COLUMN DurationSec        INT             AFTER DistanceM,
    ADD COLUMN StartedAt          DATETIME        DEFAULT CURRENT_TIMESTAMP AFTER DurationSec;
