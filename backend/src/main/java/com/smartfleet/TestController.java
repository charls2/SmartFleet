package com.smartfleet;

import com.smartfleet.controller.VehicleController;
import com.smartfleet.model.Location;
import com.smartfleet.model.Vehicle;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
public class TestController {


	public void fillVehicles() {

//		LocalDateTime now = LocalDateTime.now();

//		Location l1 = new Location("L1", 1, 1, now);
//		Location l2 = new Location("L2", 2, 2, now);
//		Location l3 = new Location("L3", 3, 3, now);
//		Location l4 = new Location("L4", 4, 4, now);
//		Location l5 = new Location("L5", 5, 5, now);
//
//		VehicleController.vehicles.add(new Vehicle("766", "Camry", "Toyota"));
//		VehicleController.vehicles.add(new Vehicle("12", "SUV", "FORD"));
//		VehicleController.vehicles.add(new Vehicle("4", "F-Type", "Jaguar"));
//		VehicleController.vehicles.add(new Vehicle("567", "GLS", "Mercedes", l4));
//		VehicleController.vehicles.add(new Vehicle("321", "SLX", "Cadillac", l5));

	}

	@GetMapping("/")
	public String index() {
//		fillVehicles();
		return "Greetings from Spring Boot!";
	}
}
