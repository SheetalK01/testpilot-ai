package com.testpilot.export;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.testpilot.support.ApiTestSupport;
import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ExportApiTest extends ApiTestSupport {

    @Test
    @DisplayName("export returns a formatted workbook that reads back with every test case")
    void exportWorkbook() throws Exception {
        String token = registerUser();
        long storyId = createStory(token, createProject(token, "Shop"), "Login & Sign-up!");
        createTestCase(token, storyId, "Low edge", "EDGE", "LOW");
        mvc.perform(authed(withJson(post("/api/stories/" + storyId + "/test-cases"), Map.of(
                        "title", "Valid login",
                        "type", "POSITIVE",
                        "priority", "HIGH",
                        "steps", List.of("Open /login", "Enter valid credentials", "Click Log in"),
                        "expectedResult", "Dashboard is shown")), token))
                .andExpect(status().isCreated());

        byte[] body = mvc.perform(authed(get("/api/stories/" + storyId + "/export"), token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", ExcelExportService.CONTENT_TYPE))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"login-sign-up-test-cases.xlsx\""))
                .andReturn().getResponse().getContentAsByteArray();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            XSSFSheet sheet = workbook.getSheet("Test Cases");
            assertThat(sheet).isNotNull();
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Login & Sign-up!");
            assertThat(workbook.getFontAt(sheet.getRow(0).getCell(0).getCellStyle().getFontIndex()).getBold()).isTrue();

            Row header = sheet.getRow(1);
            assertThat(header).extracting(cell -> cell.getStringCellValue())
                    .containsExactly("#", "Title", "Type", "Priority", "Preconditions", "Steps", "Expected Result", "Source");
            XSSFCellStyle headerStyle = (XSSFCellStyle) header.getCell(0).getCellStyle();
            assertThat(headerStyle.getFont().getBold()).isTrue();
            assertThat(headerStyle.getFillForegroundXSSFColor().getARGBHex()).isEqualTo("FF4F46E5");

            assertThat(sheet.getLastRowNum()).isEqualTo(3);
            Row first = sheet.getRow(2);
            assertThat(first.getCell(0).getNumericCellValue()).isEqualTo(1);
            assertThat(first.getCell(1).getStringCellValue()).isEqualTo("Valid login");
            assertThat(first.getCell(2).getStringCellValue()).isEqualTo("POSITIVE");
            assertThat(first.getCell(5).getStringCellValue()).isEqualTo("1. Open /login\n2. Enter valid credentials\n3. Click Log in");
            assertThat(first.getCell(5).getCellStyle().getWrapText()).isTrue();
            assertThat(first.getCell(7).getStringCellValue()).isEqualTo("MANUAL");
            assertThat(sheet.getRow(3).getCell(1).getStringCellValue()).isEqualTo("Low edge");

            assertThat(sheet.getPaneInformation().isFreezePane()).isTrue();
            assertThat(sheet.getPaneInformation().getHorizontalSplitPosition()).isEqualTo((short) 2);
            assertThat(sheet.getCTWorksheet().getAutoFilter().getRef()).isEqualTo("A2:H4");
            assertThat(sheet.getColumnWidth(5)).isGreaterThan(sheet.getColumnWidth(0));
            assertThat(typeFill(sheet, 2)).isNotEqualTo(typeFill(sheet, 3));
        }
    }

    private static String typeFill(Sheet sheet, int row) {
        return ((XSSFCellStyle) sheet.getRow(row).getCell(2).getCellStyle()).getFillForegroundXSSFColor().getARGBHex();
    }

    @Test
    @DisplayName("export of a story without test cases still has the title and header rows")
    void exportEmpty() throws Exception {
        String token = registerUser();
        long storyId = createStory(token, createProject(token, "Shop"), "Empty");

        byte[] body = mvc.perform(authed(get("/api/stories/" + storyId + "/export"), token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            XSSFSheet sheet = workbook.getSheetAt(0);
            assertThat(sheet.getLastRowNum()).isEqualTo(1);
            assertThat(sheet.getMergedRegions()).contains(new CellRangeAddress(0, 0, 0, 7));
        }
    }

    @Test
    @DisplayName("export of another user's story is 404; without a token it is 401")
    void exportSecurity() throws Exception {
        String token = registerUser();
        long storyId = createStory(token, createProject(token, "Shop"), "Private");
        mvc.perform(authed(get("/api/stories/" + storyId + "/export"), registerUser())).andExpect(status().isNotFound());
        mvc.perform(get("/api/stories/" + storyId + "/export")).andExpect(status().isUnauthorized());
    }
}
