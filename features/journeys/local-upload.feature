@regression @local-upload
Feature: Local upload journey
  As a DAM user
  I want to upload and manage a local video asset
  So that the full asset lifecycle works correctly

  @smoke @regression @local-upload
  Scenario: Full asset lifecycle with local mp4 upload
    Given I navigate to the user folder with automation assets cleaned up
    When I upload a unique mp4 with metadata
    And I open the asset and verify its metadata
    And I edit the asset and capture the item ID
    And I search for the asset by identity and verify details
    And I download the asset from the ellipsis menu
    And I share the asset via email link
    Then I delete the asset and logout
