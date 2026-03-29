package com.smartfleet.model;

import com.smartfleet.utils.VehicleStatus;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
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
    private VehicleStatus status = VehicleStatus.FUNCTIONAL;
    @OneToOne
    @JoinColumn(name="location_id", nullable = true)
    private Location location;

    // HAVE Vehicle Assignments table //
    // @OneToOne
    // @JoinColumn(name="driver_id")
    // private Driver driver;
}
