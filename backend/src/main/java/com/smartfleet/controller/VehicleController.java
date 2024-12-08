package com.smartfleet.controller;

import com.smartfleet.model.Vehicle;
import com.smartfleet.dto.LocationUpdate;
import com.smartfleet.service.VehicleService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/vehicles")
public class VehicleController {

    List<Vehicle> vehicles = new ArrayList<>();
    

    @Autowired
    private VehicleService vehicleService;

    @PostMapping("/{vehicleId}/location")
    public ResponseEntity<String> updateLocation(@PathVariable String vehicleId, @RequestBody LocationUpdate locationUpdate) {
        vehicleService.updateLocation(vehicleId, locationUpdate);
        return ResponseEntity.ok("Location updated");
    }

    @GetMapping("/{vehicleId}")
    public ResponseEntity<Vehicle> getVehicleById(@PathVariable String vehicleId) {
        // Mocked logic to find a vehicle by ID
        List<Vehicle> vehicles = new ArrayList<>(); // access from PSQL no?
        vehicles.add(new Vehicle("123", "Truck", "Ford F-150"));
        vehicles.add(new Vehicle("124", "Van", "Mercedes Sprinter"));

        Vehicle vehicle = vehicles.stream()
                                  .filter(v -> v.getId().equals(vehicleId))
                                  .findFirst()
                                  .orElse(null);

        if (vehicle == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(vehicle);
    }

    @GetMapping("/{vehicleId}/location")
    public ResponseEntity<LocationUpdate> getLocation(@PathVariable String vehicleId) {
        LocationUpdate location = vehicleService.getLocation(vehicleId);
        return ResponseEntity.ok(location);
    }

    @GetMapping
    public ResponseEntity<List<Vehicle>> getVehicles() {
        vehicles.add(new Vehicle("12345", "SPRINTER", "Ford"));
        return ResponseEntity.ok(vehicles);
    }
}
