package com.testpilot.export;

import com.testpilot.story.StoryService;
import com.testpilot.story.UserStory;
import com.testpilot.testcase.TestCase;
import com.testpilot.testcase.TestCaseRepository;
import com.testpilot.testcase.TestCaseType;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.text.Normalizer;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Builds a formatted .xlsx workbook of a story's test cases, ready to hand to a manual tester. */
@Service
public class ExcelExportService {

    public static final String CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    static final String SHEET_NAME = "Test Cases";
    static final List<String> HEADERS =
            List.of("#", "Title", "Type", "Priority", "Preconditions", "Steps", "Expected Result", "Source");
    static final int HEADER_ROW = 1;

    // Column widths in characters.
    private static final int[] WIDTHS = {5, 40, 12, 10, 30, 60, 45, 10};
    private static final byte[] HEADER_FILL = rgb(0x4F, 0x46, 0xE5); // indigo-600, matches the UI accent
    private static final Map<TestCaseType, byte[]> TYPE_FILLS = new EnumMap<>(Map.of(
            TestCaseType.POSITIVE, rgb(0xDC, 0xFC, 0xE7),
            TestCaseType.NEGATIVE, rgb(0xFE, 0xE2, 0xE2),
            TestCaseType.EDGE, rgb(0xFE, 0xF3, 0xC7)));

    private final StoryService storyService;
    private final TestCaseRepository testCases;

    public ExcelExportService(StoryService storyService, TestCaseRepository testCases) {
        this.storyService = storyService;
        this.testCases = testCases;
    }

    public record ExcelFile(String filename, byte[] content) {}

    @Transactional(readOnly = true)
    public ExcelFile export(Long userId, Long storyId) {
        UserStory story = storyService.requireOwned(userId, storyId);
        List<TestCase> cases = testCases.findByStoryOrdered(storyId);
        return new ExcelFile(slug(story.getTitle()) + "-test-cases.xlsx", build(story.getTitle(), cases));
    }

    byte[] build(String storyTitle, List<TestCase> cases) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet(SHEET_NAME);
            Styles styles = new Styles(workbook);

            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(24);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(storyTitle);
            titleCell.setCellStyle(styles.title);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, HEADERS.size() - 1));

            Row header = sheet.createRow(HEADER_ROW);
            for (int col = 0; col < HEADERS.size(); col++) {
                Cell cell = header.createCell(col);
                cell.setCellValue(HEADERS.get(col));
                cell.setCellStyle(styles.header);
                sheet.setColumnWidth(col, WIDTHS[col] * 256);
            }

            for (int i = 0; i < cases.size(); i++) {
                TestCase tc = cases.get(i);
                Row row = sheet.createRow(HEADER_ROW + 1 + i);
                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(tc.getTitle());
                row.createCell(2).setCellValue(tc.getType().name());
                row.createCell(3).setCellValue(tc.getPriority().name());
                row.createCell(4).setCellValue(tc.getPreconditions() == null ? "" : tc.getPreconditions());
                row.createCell(5).setCellValue(numberedSteps(tc.getStepList()));
                row.createCell(6).setCellValue(tc.getExpectedResult());
                row.createCell(7).setCellValue(tc.getSource().name());
                for (Cell cell : row) {
                    cell.setCellStyle(cell.getColumnIndex() == 2 ? styles.typeStyles.get(tc.getType()) : styles.body);
                }
            }

            sheet.createFreezePane(0, HEADER_ROW + 1);
            int lastRow = Math.max(HEADER_ROW, HEADER_ROW + cases.size());
            sheet.setAutoFilter(new CellRangeAddress(HEADER_ROW, lastRow, 0, HEADERS.size() - 1));
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not build Excel export", e);
        }
    }

    static String numberedSteps(List<String> steps) {
        return IntStream.range(0, steps.size())
                .mapToObj(i -> (i + 1) + ". " + steps.get(i))
                .collect(Collectors.joining("\n"));
    }

    /** "Login & Sign-up!" -> "login-sign-up"; never empty, at most 60 characters. */
    static String slug(String title) {
        String ascii = Normalizer.normalize(title, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        if (slug.length() > 60) {
            slug = slug.substring(0, 60).replaceAll("-+$", "");
        }
        return slug.isEmpty() ? "story" : slug;
    }

    private static byte[] rgb(int r, int g, int b) {
        return new byte[] {(byte) r, (byte) g, (byte) b};
    }

    private static final class Styles {
        final CellStyle title;
        final CellStyle header;
        final CellStyle body;
        final Map<TestCaseType, CellStyle> typeStyles = new EnumMap<>(TestCaseType.class);

        Styles(XSSFWorkbook workbook) {
            XSSFFont titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            title = workbook.createCellStyle();
            title.setFont(titleFont);
            title.setVerticalAlignment(VerticalAlignment.CENTER);

            XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(new XSSFColor(rgb(0xFF, 0xFF, 0xFF), null));
            XSSFCellStyle headerStyle = bordered(workbook);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(new XSSFColor(HEADER_FILL, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            header = headerStyle;

            body = bordered(workbook);

            TYPE_FILLS.forEach((type, color) -> {
                XSSFCellStyle style = bordered(workbook);
                style.setFillForegroundColor(new XSSFColor(color, null));
                style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                style.setAlignment(HorizontalAlignment.CENTER);
                typeStyles.put(type, style);
            });
        }

        private static XSSFCellStyle bordered(XSSFWorkbook workbook) {
            XSSFCellStyle style = workbook.createCellStyle();
            style.setWrapText(true);
            style.setVerticalAlignment(VerticalAlignment.TOP);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            return style;
        }
    }
}
