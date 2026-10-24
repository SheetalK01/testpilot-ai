package com.testpilot.aiengine;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * On free hosting both services sleep when idle. When a visitor wakes the backend, the backend
 * wakes the AI engine straight away, so the first "Generate" click does not wait for a second
 * cold start.
 */
@Component
public class AiEngineWakeUp {

    private final AiEngineClient aiEngine;

    public AiEngineWakeUp(AiEngineClient aiEngine) {
        this.aiEngine = aiEngine;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        aiEngine.wakeUp();
    }
}
