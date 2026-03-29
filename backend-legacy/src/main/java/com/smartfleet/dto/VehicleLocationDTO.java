package com.smartfleet.dto;

import java.time.LocalDateTime;

public class VehicleLocationDTO {

    private Long vehicleId;      // Unique identifier for the vehicle
    private double latitude;       // Latitude of the vehicle's location
    private double longitude;      // Longitude of the vehicle's location
    private LocalDateTime timestamp; // Time when the location was recorded

    // Constructor
    public VehicleLocationDTO(Long vehicleId, double latitude, double longitude, LocalDateTime timestamp) {
        this.vehicleId = vehicleId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
    }

    // Default Constructor
    public VehicleLocationDTO() {}

    // Getters and Setters
    public Long getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    // toString Method (for logging/debugging)
    @Override
    public String toString() {
        return "VehicleLocationDTO{" +
                "vehicleId='" + vehicleId + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", timestamp=" + timestamp +
                '}';
    }
}
