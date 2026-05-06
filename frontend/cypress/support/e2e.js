// Custom commands for common actions

// Search for a location
Cypress.Commands.add("searchLocation", (location) => {
    cy.get('input[placeholder*="honeymoon"]').clear().type(location);
    cy.get('input[placeholder*="honeymoon"]').type("{enter}");
});

// Wait for results to load (progress bar appears then disappears)
Cypress.Commands.add("waitForResults", () => {
    // Wait for loading to finish — either results appear or empty state
    cy.get("body").then(($body) => {
        // If progress bar is visible, wait for it to disappear
        if ($body.find('[class*="animate"]').length > 0) {
            cy.get('[class*="animate"]', { timeout: 120000 }).should("not.exist");
        }
    });
    // Results or empty state should be visible
    cy.get("body", { timeout: 120000 }).should("satisfy", ($body) => {
        const hasResults = $body.find('[class*="rounded-2xl"][class*="shadow-md"]').length > 0;
        const hasEmpty = $body.text().includes("No hotels found");
        const hasHotels = $body.text().includes("hotel");
        return hasResults || hasEmpty || hasHotels;
    });
});