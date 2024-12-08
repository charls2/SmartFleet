package com.smartfleet.config;

import com.smartfleet.handler.VehicleLocationWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final VehicleLocationWebSocketHandler vehicleLocationWebSocketHandler;

    public WebSocketConfig(VehicleLocationWebSocketHandler vehicleLocationWebSocketHandler) {
        this.vehicleLocationWebSocketHandler = vehicleLocationWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(vehicleLocationWebSocketHandler, "/ws/locations")
                .setAllowedOrigins("*") // Replace with specific origins for production
                .addInterceptors(new HttpSessionHandshakeInterceptor());
    }
}
