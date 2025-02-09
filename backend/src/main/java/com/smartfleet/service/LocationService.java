package com.smartfleet.service;

import com.smartfleet.model.Location;
import com.smartfleet.repository.LocationRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class LocationService {

    private final LocationRepository locationRepository;

    public LocationService(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

//    public Optional<Location> getLocationByVehicleId(String id) {
////        return locationRepository.findByVehicleId(id);
//    }
}
