package com.testpilot.common;

import com.testpilot.aiengine.AiEngineException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tools.jackson.databind.DatabindException;
import tools.jackson.databind.exc.InvalidFormatException;

/** Maps every exception to {@link ApiError}. Stack traces and internal messages never reach the client. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final ApiErrorWriter errors;

    public GlobalExceptionHandler(ApiErrorWriter errors) {
        this.errors = errors;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
        ex.getBindingResult().getGlobalErrors().forEach(ge -> fieldErrors.putIfAbsent(ge.getObjectName(), ge.getDefaultMessage()));
        return respond(HttpStatus.BAD_REQUEST, "Validation failed", fieldErrors, request);
    }

    /** Malformed JSON, or a value of the wrong type such as an unknown enum constant. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        if (ex.getCause() instanceof InvalidFormatException ife && !ife.getPath().isEmpty()) {
            String field = fieldPath(ife);
            String message = ife.getTargetType() != null && ife.getTargetType().isEnum()
                    ? "must be one of " + Arrays.stream(ife.getTargetType().getEnumConstants())
                            .map(Object::toString)
                            .collect(Collectors.joining(", ", "[", "]"))
                    : "has an invalid value";
            return respond(HttpStatus.BAD_REQUEST, "Validation failed", Map.of(field, message), request);
        }
        if (ex.getCause() instanceof DatabindException de && !de.getPath().isEmpty()) {
            return respond(HttpStatus.BAD_REQUEST, "Validation failed", Map.of(fieldPath(de), "has an invalid value"), request);
        }
        return respond(HttpStatus.BAD_REQUEST, "Malformed JSON request", null, request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, "Invalid value for parameter '" + ex.getName() + "'", null, request);
    }

    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<ApiError> badRequest(BadRequestException ex, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, ex.getMessage(), null, request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<ApiError> badCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return respond(HttpStatus.UNAUTHORIZED, "Invalid email or password", null, request);
    }

    @ExceptionHandler({NotFoundException.class, NoResourceFoundException.class})
    ResponseEntity<ApiError> notFound(Exception ex, HttpServletRequest request) {
        String message = ex instanceof NotFoundException ? ex.getMessage() : "Resource not found";
        return respond(HttpStatus.NOT_FOUND, message, null, request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> methodNotAllowed(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return respond(HttpStatus.METHOD_NOT_ALLOWED, "Method " + ex.getMethod() + " not allowed", null, request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> unsupportedMediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        return respond(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Content type must be application/json", null, request);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    ResponseEntity<ApiError> tooManyRequests(TooManyRequestsException ex, HttpServletRequest request) {
        return respond(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), null, request);
    }

    @ExceptionHandler(ConflictException.class)
    ResponseEntity<ApiError> conflict(ConflictException ex, HttpServletRequest request) {
        return respond(HttpStatus.CONFLICT, ex.getMessage(), null, request);
    }

    @ExceptionHandler(AiEngineException.class)
    ResponseEntity<ApiError> aiEngine(AiEngineException ex, HttpServletRequest request) {
        return respond(HttpStatus.BAD_GATEWAY, "AI engine failed: " + ex.getMessage(), null, request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error", null, request);
    }

    private static String fieldPath(DatabindException ex) {
        return ex.getPath().stream()
                .map(ref -> ref.getPropertyName() != null ? ref.getPropertyName() : "[" + ref.getIndex() + "]")
                .collect(Collectors.joining("."))
                .replace(".[", "[");
    }

    private ResponseEntity<ApiError> respond(
            HttpStatus status, String message, Map<String, String> fieldErrors, HttpServletRequest request) {
        return ResponseEntity.status(status).body(errors.build(status, message, fieldErrors, request));
    }
}
