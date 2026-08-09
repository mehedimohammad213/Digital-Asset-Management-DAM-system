@smoke @auth
Feature: Login
  As a Marcombox user
  I want to authenticate securely
  So that I can access the DAM application

  @smoke @auth
  Scenario: Successful login redirects to home
    Given I am on the login page
    When I sign in with valid credentials
    Then I should see the DAM home page

  @smoke @auth @negative
  Scenario: Invalid password keeps user on login page
    Given I am on the login page
    When I sign in with an invalid password
    Then I should remain on the login page
