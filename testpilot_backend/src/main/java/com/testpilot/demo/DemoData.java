package com.testpilot.demo;

import com.testpilot.testcase.Priority;
import com.testpilot.testcase.TestCaseContent;
import com.testpilot.testcase.TestCaseType;
import java.util.List;

/** Sample content for demo accounts, so a visitor sees a realistic workspace straight away. */
final class DemoData {

    private DemoData() {}

    record Story(String title, String description, String acceptanceCriteria, List<TestCaseContent> aiCases) {}

    static final String PROJECT_NAME = "Web Shop (demo)";
    static final String PROJECT_DESCRIPTION = "Sample project: checkout, cart and account flows of an online store.";

    static final List<Story> STORIES = List.of(
            new Story(
                    "User login",
                    "As a registered user, I want to log in with my email and password so that I can see my dashboard.",
                    "Valid credentials open the dashboard\n"
                            + "A wrong password shows \"Invalid email or password\"\n"
                            + "Email and password are required\n"
                            + "The account locks after 5 failed attempts",
                    List.of(
                            tc("Log in with valid credentials", TestCaseType.POSITIVE, Priority.HIGH,
                                    "A registered account exists",
                                    List.of("Open the login page", "Enter a registered email and its password", "Click \"Log in\""),
                                    "The dashboard opens and shows the user's name"),
                            tc("Wrong password shows an error", TestCaseType.NEGATIVE, Priority.HIGH,
                                    "A registered account exists",
                                    List.of("Open the login page", "Enter a registered email and a wrong password", "Click \"Log in\""),
                                    "\"Invalid email or password\" is shown and the user stays on the login page"),
                            tc("Empty email and password are rejected", TestCaseType.NEGATIVE, Priority.MEDIUM, "",
                                    List.of("Open the login page", "Leave both fields empty", "Click \"Log in\""),
                                    "Both fields show a required-field error and no request is sent"),
                            tc("Account locks after 5 failed attempts", TestCaseType.EDGE, Priority.HIGH,
                                    "A registered account exists",
                                    List.of("Enter a wrong password 5 times in a row", "Enter the correct password", "Click \"Log in\""),
                                    "The account is locked and a message explains how to unlock it"),
                            tc("Email is case-insensitive", TestCaseType.POSITIVE, Priority.LOW,
                                    "An account exists for user@example.com",
                                    List.of("Enter USER@EXAMPLE.COM and the correct password", "Click \"Log in\""),
                                    "The user is logged in"))),
            new Story(
                    "Cart checkout",
                    "As a shopper, I want to check out the items in my cart so that I can buy them.",
                    "Checkout shows items, quantities and the total including tax\n"
                            + "A declined card shows an error and keeps the cart\n"
                            + "An empty cart cannot be checked out",
                    List.of(
                            tc("Checkout shows items and total with tax", TestCaseType.POSITIVE, Priority.HIGH,
                                    "The cart has two different items",
                                    List.of("Open the cart", "Click \"Checkout\""),
                                    "Each item, its quantity and the total including tax are shown"),
                            tc("Declined card keeps the cart", TestCaseType.NEGATIVE, Priority.HIGH,
                                    "The cart has one item",
                                    List.of("Go to checkout", "Pay with a card that will be declined"),
                                    "A payment error is shown and the cart still contains the item"),
                            tc("Empty cart cannot be checked out", TestCaseType.EDGE, Priority.MEDIUM,
                                    "The cart is empty",
                                    List.of("Open the cart"),
                                    "The \"Checkout\" button is disabled and an empty-cart message is shown"))),
            new Story(
                    "Password reset",
                    "As a user who forgot my password, I want to reset it by email so that I can regain access.",
                    "A registered email receives a reset link\n"
                            + "An unknown email shows the same confirmation message\n"
                            + "The reset link expires after 30 minutes",
                    List.of()));

    private static TestCaseContent tc(
            String title, TestCaseType type, Priority priority, String preconditions, List<String> steps, String expected) {
        return TestCaseContent.of(title, type, priority, preconditions, steps, expected);
    }
}
