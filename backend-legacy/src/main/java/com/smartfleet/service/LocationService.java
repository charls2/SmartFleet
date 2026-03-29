package com.smartfleet.service;

import com.smartfleet.model.Location;
import com.smartfleet.model.Vehicle;
import com.smartfleet.repository.LocationRepository;
import com.smartfleet.repository.VehicleRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class LocationService {

    private final VehicleRepository vehicleRepository;
    private final LocationRepository locationRepository;

    public LocationService(VehicleRepository vehicleRepository, LocationRepository locationRepository) {
        this.vehicleRepository = vehicleRepository;
        this.locationRepository = locationRepository;
    }

//    @Transactional
//    public Location updateVehicleLocation(Long vehicleId, double latitude, double longitude) {
//        // Retrieve or create the location
//        Optional<Location> optionalLocation = locationRepository.findByVehicleId(vehicleId);
//        Location location;
//
//        if (optionalLocation.isPresent()) {
//            // Update the existing location
//            location = optionalLocation.get();
//            location.setLatitude(latitude);
//            location.setLongitude(longitude);
//            location.setLastUpdated(LocalDateTime.now());
//        } else {
//            // Create a new location
//            location = new Location(vehicleId, latitude, longitude, LocalDateTime.now());
//        }
//
//        // Save the location
//        location = locationRepository.save(location);
//
//        // Update the Vehicle's loc_id
////        Vehicle vehicle = vehicleRepository.findById(vehicleId)
////                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
////        vehicle.setLoc(location.getId());
////        vehicleRepository.save(vehicle);
//
//        return location;
//    }
}
