package com.testpilot.common;

/** A well-formed request that cannot be processed in the current state (e.g. no test cases yet). */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
