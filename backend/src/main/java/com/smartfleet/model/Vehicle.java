package com.smartfleet.model;

public class Vehicle {
    private String id;
    private String type;
    private String model;

    public Vehicle(String id, String type, String model) {
        this.id = id;
        this.type = type;
        this.model = model;
    }

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }
}
