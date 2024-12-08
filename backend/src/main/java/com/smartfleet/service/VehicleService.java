package com.smartfleet.service;

import com.smartfleet.dto.LocationUpdate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VehicleService {

    private final Map<String, LocationUpdate> locationCache = new ConcurrentHashMap<>();

    public void updateLocation(String vehicleId, LocationUpdate locationUpdate) {
        // Save location in cache or database
        locationCache.put(vehicleId, locationUpdate);
    }

    public LocationUpdate getLocation(String vehicleId) {
        return locationCache.getOrDefault(vehicleId, null);
    }
}
