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

    @Autowired
    private VehicleService vehicleService;

    @PostMapping("/{vehicleId}/location")
    public ResponseEntity<String> updateLocation(
            @PathVariable String vehicleId,
            @RequestBody LocationUpdate locationUpdate) {
        vehicleService.updateLocation(vehicleId, locationUpdate);
        return ResponseEntity.ok("Location updated");
    }

    @GetMapping("/{vehicleId}/location")
    public ResponseEntity<LocationUpdate> getLocation(@PathVariable String vehicleId) {
        LocationUpdate location = vehicleService.getLocation(vehicleId);
        return ResponseEntity.ok(location);
    }

    @GetMapping
    public ResponseEntity<List<Vehicle>> getVehicles() {
    	List<Vehicle> vehicles = new ArrayList<>();
        vehicles.add(new Vehicle("123", "Truck", "Ford F-150"));
	vehicles.add(new Vehicle("124", "Van", "Mercedes Sprinter"));
        return ResponseEntity.ok(vehicles);
    }
}
