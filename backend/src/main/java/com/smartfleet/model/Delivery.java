package com.smartfleet.model;

//import org.springframework.web.bind.annotation.RestController;

public class Delivery {

    private int deliveryId;
    private String deliveryName;
    private String deliveryAddress;
    private String deliveryCity;
    private String deliveryState;
    private String deliveryZip;
    private String deliveryCountry;
    private String deliveryPhone;
    private String deliveryEmail;
    private String deliveryComment;

    private String deliveryStatus;
    private String deliveryDate;
    private String deliveryType;

    public Delivery(int deliveryId, String deliveryName, String deliveryCity, String deliveryState,  String deliveryAddress, String deliveryZip, String deliveryCountry, String deliveryPhone, String deliveryEmail, String deliveryComment, String deliveryStatus, String deliveryDate, String deliveryType) {
        this.deliveryId = deliveryId; // Get from
        this.deliveryName = deliveryName;
        this.deliveryAddress = deliveryAddress;
        this.deliveryCity = deliveryCity;
        this.deliveryState = deliveryState;
        this.deliveryZip = deliveryZip;
        this.deliveryCountry = deliveryCountry;
        this.deliveryPhone = deliveryPhone;
        this.deliveryEmail = deliveryEmail;
        this.deliveryComment = deliveryComment;
        this.deliveryStatus = deliveryStatus;
        this.deliveryDate = deliveryDate;
        this.deliveryType = deliveryType;
    }
}
