package com.accafr.app;

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenSecurity")
public class ScreenSecurityPlugin extends Plugin {

    /**
     * Enables FLAG_SECURE on the current Activity window.
     * This prevents screenshots, screen recording, and display in the Recents thumbnail.
     */
    @PluginMethod
    public void enableScreenSecurity(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getActivity()
                .getWindow()
                .addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        });
        call.resolve();
    }

    /**
     * Removes FLAG_SECURE, restoring normal screenshot behaviour.
     */
    @PluginMethod
    public void disableScreenSecurity(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getActivity()
                .getWindow()
                .clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        });
        call.resolve();
    }
}
