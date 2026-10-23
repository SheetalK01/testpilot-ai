package com.testpilot.aiengine;

/** The AI engine timed out, was unreachable, returned non-2xx, or returned an unusable body. Maps to 502. */
public class AiEngineException extends RuntimeException {

    public AiEngineException(String reason) {
        super(reason);
    }

    public AiEngineException(String reason, Throwable cause) {
        super(reason, cause);
    }
}
