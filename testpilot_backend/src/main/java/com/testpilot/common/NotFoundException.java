package com.testpilot.common;

/** Resource does not exist or is not owned by the caller; both map to 404 so IDs are not leaked. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String resource) {
        super(resource + " not found");
    }
}
