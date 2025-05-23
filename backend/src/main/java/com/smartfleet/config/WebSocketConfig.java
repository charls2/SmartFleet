package com.smartfleet.config;

import com.smartfleet.handler.VehicleLocationWebSocket;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final VehicleLocationWebSocket vehicleLocationWebSocket;

    public WebSocketConfig(VehicleLocationWebSocket vehicleLocationWebSocketHandler) {
        this.vehicleLocationWebSocket = vehicleLocationWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(vehicleLocationWebSocket, "/ws/locations")
                .setAllowedOrigins("*") // Replace with specific origins for production
                .addInterceptors(new HttpSessionHandshakeInterceptor());
    }
}
