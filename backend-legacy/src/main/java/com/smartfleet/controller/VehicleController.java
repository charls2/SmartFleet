package com.smartfleet.controller;

import com.smartfleet.dto.VehicleDTO;
import com.smartfleet.model.Location;
import com.smartfleet.model.Vehicle;
import com.smartfleet.repository.LocationRepository;
import com.smartfleet.repository.VehicleRepository;
import com.smartfleet.service.VehicleService;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * This class manages request that begin with /vehicles
 */
@RestController
@RequestMapping("/vehicles")
public class VehicleController {

    @Autowired
    private VehicleService vehicleService;

    private final VehicleRepository vehicleRepository;
    private final LocationRepository locationRepository;

    public VehicleController(VehicleRepository vehicleRepository, LocationRepository locationRepository) {
        this.vehicleRepository = vehicleRepository;
        this.locationRepository = locationRepository;
    }

    @GetMapping
    public ResponseEntity<List<VehicleDTO>> getAllVehicle() {
        List<VehicleDTO> vehicles = new ArrayList<>();
        
        for (Vehicle vehicle : vehicleRepository.findAll()) {
            VehicleDTO vdto = new VehicleDTO(
                    vehicle.getId(),
                    vehicle.getBrand(),
                    vehicle.getModel(),
                    vehicle.getColor(),
                    vehicle.getEngineModel(),
                    vehicle.getFuelType(),
                    vehicle.getGearType(),
                    vehicle.getLocation() != null ? vehicle.getLocation().getLatitude() : 0.0,
                    vehicle.getLocation() != null ? vehicle.getLocation().getLongitude() : 0.0,
                    vehicle.getLocation().getLastUpdated()
            );
            vehicles.add(vdto);
        }
        return ResponseEntity.ok(vehicles);
    }

    public String showVehiclesPage() {
        RestTemplate restTemplate = new RestTemplate();
        String apiUrl = "http://localhost:8080/vehicles"; // API Endpoint
        List<?> vehicles = restTemplate.getForObject(apiUrl, List.class);
        return "vehicles"; // Returns the `vehicles.html` page
    }

    @GetMapping("/{vehicleId}")
    public ResponseEntity<VehicleDTO> getVehicleById(@PathVariable Long vehicleId) {
        Optional<Vehicle> vehicleOptional = vehicleRepository.findById(vehicleId);

        if (vehicleOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Vehicle vehicle = vehicleOptional.get();
        VehicleDTO vehicleDTO = new VehicleDTO(
                vehicle.getId(),
                vehicle.getBrand(),
                vehicle.getModel(),
                vehicle.getColor(),
                vehicle.getEngineModel(),
                vehicle.getFuelType(),
                vehicle.getGearType(),
                vehicle.getLocation() != null ? vehicle.getLocation().getLatitude() : 0.0,
                vehicle.getLocation() != null ? vehicle.getLocation().getLongitude() : 0.0,
                vehicle.getLocation() != null ? vehicle.getLocation().getLastUpdated() : null
        );

        return ResponseEntity.ok(vehicleDTO);
    }

    @PostMapping
    public ResponseEntity<Vehicle> createVehicle(@RequestBody Vehicle vehicle) {
        Vehicle newVehicle = vehicleService.addVehicle(vehicle);
        return new ResponseEntity<>(newVehicle, HttpStatus.CREATED);
    }

    // Move a vehicle (update location)
//    @GetMapping("/{vehicleId}/move")
//    public ResponseEntity<Location> moveVehicle(
//            @PathVariable Long vehicleId,
//            @RequestParam double latitude,
//            @RequestParam double longitude) {
//
//        // Check if the vehicle exists
//        Optional<Vehicle> optionalVehicle = vehicleRepository.findById(vehicleId);
//        if (optionalVehicle.isEmpty()) {
//            return ResponseEntity.notFound().build();
//        }
//
//        // Check if the location already exists for the vehicle
//        Optional<Location> existingLocation = locationRepository.findByVehicleId(vehicleId);
//        Location location;
//
//        if (existingLocation.isPresent()) {
//            // Update the existing location
//            location = existingLocation.get();
//            location.setLatitude(latitude);
//            location.setLongitude(longitude);
//            location.setLastUpdated(LocalDateTime.now());
//        } else {
//            // Create a new location
//            location = new Location(vehicleId, latitude, longitude, LocalDateTime.now());
//        }
//
//        // Save the updated/new location
//        locationRepository.save(location);
//        return ResponseEntity.ok(location);
//    }

    // Get current location of a vehicle
    @GetMapping("/{vehicleId}/location")
    public ResponseEntity<Location> getCurrentLocation(@PathVariable Vehicle vehicleId) {
        return locationRepository.findByVehicle(vehicleId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
