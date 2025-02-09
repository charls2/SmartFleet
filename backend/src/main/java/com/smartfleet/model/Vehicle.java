package com.smartfleet.model;

import jakarta.persistence.*;

@Entity
@Table(name="vehicle")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Primary Key
    private String model;
    private String brand;
    private String color;
    private String engineModel;
    private String fuelType;
    private String gearType;

//    @OneToOne
//    private Location loc;


    public Vehicle(String model, String brand, String color, String engineModel, String fuelType, String gearType) {
        this.model = model;
        this.brand = brand;
        this.color = color;
        this.engineModel = engineModel;
        this.fuelType = fuelType;
        this.gearType = gearType;
    }

    public Vehicle() {}

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
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

//    public Location getLoc() {
//        return loc;
//    }
//
//    public void setLoc(Location loc) {
//        this.loc = loc;
//    }
}
