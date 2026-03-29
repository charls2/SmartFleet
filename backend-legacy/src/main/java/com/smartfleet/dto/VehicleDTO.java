package com.smartfleet.dto;

import java.time.LocalDateTime;

public class VehicleDTO {
    private Long id;
    private String brand;
    private String model;
    private String color;
    private String engineModel;
    private String fuelType;
    private String gearType;
    private double latitude;
    private double longitude;

    public VehicleDTO(Long id, String brand, String model, String color, String engineModel, String fuelType, String gearType, double latitude, double longitude, LocalDateTime lastUpdated) {
        this.id = id;
        this.brand = brand;
        this.model = model;
        this.color = color;
        this.latitude = latitude;
        this.longitude = longitude;
        this.engineModel = engineModel;
        this.fuelType = fuelType;
        this.gearType = gearType;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
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

    public String getEngineModel() {
        return engineModel;
    }

    public void setEngineModel(String engineModel) {
        this.engineModel = engineModel;
    }

    public String getFuelType() {
        return fuelType;
    }

    public void setFuelType(String fuelType) {
        this.fuelType = fuelType;
    }

    public String getGearType() {
        return gearType;
    }

    public void setGearType(String gearType) {
        this.gearType = gearType;
    }

    // Getters and Setters
}

