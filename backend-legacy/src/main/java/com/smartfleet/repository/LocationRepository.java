package com.smartfleet.repository;

import com.smartfleet.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import com.smartfleet.model.Location;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LocationRepository extends JpaRepository<Location, Vehicle> {
    Optional<Location> findByVehicle(Vehicle vehicleId);
}
