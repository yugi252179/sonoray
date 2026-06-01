package com.sonoray.erp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class LocationService extends Service implements LocationListener {
    private static final String TAG = "LocationService";
    private static final String CHANNEL_ID = "LocationServiceChannel";
    private static final int NOTIFICATION_ID = 2002;

    private LocationManager locationManager;
    private String employeeId;
    private String token;
    private String apiUrl;

    // Minimum distance change to update in meters (e.g. 5 meters)
    private static final float MIN_DISTANCE_CHANGE_FOR_UPDATES = 5; 
    // Minimum time between updates in milliseconds (e.g. 20 seconds)
    private static final long MIN_TIME_BW_UPDATES = 20000; 

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            employeeId = intent.getStringExtra("employeeId");
            token = intent.getStringExtra("token");
            apiUrl = intent.getStringExtra("apiUrl");

            // Format API URL to ensure it has no trailing slash issues
            if (apiUrl != null && apiUrl.endsWith("/")) {
                apiUrl = apiUrl.substring(0, apiUrl.length() - 1);
            }
        }

        createNotificationChannel();
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Sonoray ERP - Active Geolocation")
                .setContentText("Continuous background GPS tracking is active.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build();

        startForeground(NOTIFICATION_ID, notification);
        startLocationTracking();

        return START_STICKY;
    }

    private void startLocationTracking() {
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        MIN_TIME_BW_UPDATES,
                        MIN_DISTANCE_CHANGE_FOR_UPDATES,
                        this
                );
            } else if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        MIN_TIME_BW_UPDATES,
                        MIN_DISTANCE_CHANGE_FOR_UPDATES,
                        this
                );
            }
        } catch (SecurityException e) {
            Log.e(TAG, "No permission to track location", e);
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location == null) return;
        Log.d(TAG, "GPS Update: " + location.getLatitude() + ", " + location.getLongitude());

        final double lat = location.getLatitude();
        final double lng = location.getLongitude();
        final int battery = getBatteryLevel();

        // Stream coordinate update asynchronously to Server
        new Thread(new Runnable() {
            @Override
            public void run() {
                sendLocationToServer(lat, lng, battery);
            }
        }).start();
    }

    private void sendLocationToServer(double lat, double lng, int batteryLevel) {
        if (employeeId == null || token == null || apiUrl == null) {
            Log.e(TAG, "Missing tracking config. employeeId=" + employeeId + ", apiUrl=" + apiUrl);
            return;
        }

        try {
            URL url = new URL(apiUrl + "/api/tracking/update");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setDoOutput(true);

            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            String timestamp = sdf.format(new Date());

            String jsonPayload = String.format(Locale.US,
                    "{\"employeeId\":\"%s\",\"latitude\":%f,\"longitude\":%f,\"batteryLevel\":%d,\"timestamp\":\"%s\"}",
                    employeeId, lat, lng, batteryLevel, timestamp
            );

            Log.d(TAG, "Sending payload: " + jsonPayload);

            OutputStream os = conn.getOutputStream();
            os.write(jsonPayload.getBytes("UTF-8"));
            os.close();

            int responseCode = conn.getResponseCode();
            Log.d(TAG, "Server responded with status code: " + responseCode);
            conn.disconnect();

        } catch (Exception e) {
            Log.e(TAG, "Failed sending tracking coordinate to server", e);
        }
    }

    private int getBatteryLevel() {
        Intent batteryStatus = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (batteryStatus != null) {
            int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            if (level != -1 && scale != -1) {
                return (int) ((level / (float) scale) * 100);
            }
        }
        return 100;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Location Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
        Log.d(TAG, "Background Geolocation Service Stopped.");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}
}
