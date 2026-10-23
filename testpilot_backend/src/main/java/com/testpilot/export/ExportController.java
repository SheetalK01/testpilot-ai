package com.testpilot.export;

import com.testpilot.auth.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Export", description = "Download test cases as Excel")
public class ExportController {

    private final ExcelExportService exportService;
    private final CurrentUser currentUser;

    public ExportController(ExcelExportService exportService, CurrentUser currentUser) {
        this.exportService = exportService;
        this.currentUser = currentUser;
    }

    @GetMapping("/api/stories/{storyId}/export")
    @Operation(summary = "Export a story's test cases as an .xlsx workbook")
    @ApiResponse(responseCode = "200", description = "Excel workbook")
    @ApiResponse(responseCode = "401", description = "Missing, invalid or expired token")
    @ApiResponse(responseCode = "404", description = "Story not found or not owned")
    public ResponseEntity<byte[]> export(@PathVariable Long storyId) {
        ExcelExportService.ExcelFile file = exportService.export(currentUser.id(), storyId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(ExcelExportService.CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(file.filename()).build().toString())
                .body(file.content());
    }
}
