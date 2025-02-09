package com.smartfleet.service;

import com.smartfleet.model.Vehicle;
import com.smartfleet.repository.VehicleRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
public class VehicleSimulationService {

    private final VehicleRepository vehicleRepository;
    private final Random random = new Random();

    public VehicleSimulationService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    // Simulate vehicle movement every 5 seconds
    @Scheduled(fixedRate = 5000)
    public void moveVehicles() {
        Iterable<Vehicle> vehicles = vehicleRepository.findAll();
        for (Vehicle vehicle : vehicles) {
            double deltaLat = (random.nextDouble() - 0.5) * 0.01; // Small latitude change
            double deltaLon = (random.nextDouble() - 0.5) * 0.01; // Small longitude change

            vehicle.getLoc().setLatitude(vehicle.getLoc().getLatitude() + deltaLat);
            vehicle.getLoc().setLongitude(vehicle.getLoc().getLongitude() + deltaLon);
            vehicle.getLoc().setLastUpdated(LocalDateTime.now());

            vehicleRepository.save(vehicle);
            System.out.println("Vehicle " + vehicle.getLoc().getVehicleId() + " moved to " +
                    vehicle.getLoc().getLatitude() + ", " + vehicle.getLoc().getLongitude());
        }
    }
}
