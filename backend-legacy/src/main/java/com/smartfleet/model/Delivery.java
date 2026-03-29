package com.smartfleet.model;

import com.smartfleet.utils.DeliveryStatus;

// import org.springframework.web.bind.annotation.RestController;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
public class Delivery {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String address;
    private String city;
    private String province;
    private String postalCode;
    private String email;
    private String comment;
    @Enumerated(EnumType.STRING)
    private DeliveryStatus delivery_status;
    private String date;
    @ManyToOne
    @JoinColumn(name="driver_id", nullable = true)
    private Driver driver;
}
