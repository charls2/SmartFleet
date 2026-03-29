package com.smartfleet.model;

import java.util.List;
import com.smartfleet.utils.DriverStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
public class Driver {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String firstname;
    private String lastname;
    private String license_number;
    private String phone_number;
    @Enumerated(EnumType.STRING)
    private DriverStatus driver_status = DriverStatus.OFF_DUTY;
    @OneToMany(mappedBy = "driver")
    private List<Delivery> deliveries;
}
