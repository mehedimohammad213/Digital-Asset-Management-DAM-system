@smoke @api
Feature: API health
  As a QA engineer
  I want to verify application availability
  So that smoke checks catch outages early

  @smoke @api
  Scenario: Application root responds without server error
    When I request the application root URL
    Then the response status should be below 500

  @smoke @api
  Scenario: Login page is reachable
    When I request the login page URL
    Then the login page should respond successfully
