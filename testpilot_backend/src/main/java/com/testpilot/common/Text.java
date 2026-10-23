package com.testpilot.common;

/** Small string helpers shared by the services. */
public final class Text {

    private Text() {}

    /** Trims a value and turns blank strings into null, so optional fields are stored consistently. */
    public static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
