@regression @guest-upload
Feature: Guest upload journey
  As a DAM user
  I want to invite a guest to upload via folder share link
  So that external contributors can add assets securely

  @regression @guest-upload
  Scenario: Guest upload jpg via folder share link
    Given I open the user folder in DAM assets
    When I send a guest upload invite by email
    And I wait two minutes after the share link is sent
    Then the uploaded jpg should appear in the DAM folder
