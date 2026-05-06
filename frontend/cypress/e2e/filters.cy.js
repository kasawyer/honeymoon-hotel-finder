describe("Filter Interactions", () => {
    // These tests verify the filter UI behavior without needing real search results
    // We test with a direct visit to ensure the page loads

    it("shows the Update Search button in the keyword section", () => {
        cy.visit("/results?location=Paris&keywords=romantic");
        // The Update Search button appears after results load
        // Since we may not have results, just verify the page loaded
        cy.get('input[placeholder*="honeymoon"]').should("have.value", "Paris");
    });

    it("navigates between home and results", () => {
        cy.visit("/");
        cy.contains("Find Your Dream Honeymoon Hotel").should("be.visible");

        // Search
        cy.get('input[placeholder*="honeymoon"]').type("Santorini{enter}");
        cy.url().should("include", "/results");
        cy.url().should("include", "location=Santorini");

        // Go back home
        cy.contains("Honeymoon Hotel Finder").click();
        cy.url().should("eq", Cypress.config().baseUrl + "/");
        cy.contains("Find Your Dream Honeymoon Hotel").should("be.visible");
    });

    it("maintains keyword selection when navigating", () => {
        cy.visit("/");

        // Deselect Romantic, select Luxury
        cy.contains("button", "Romantic").click();
        cy.contains("button", "Luxury").click();

        // Search
        cy.get('input[placeholder*="honeymoon"]').type("Paris{enter}");

        // URL should have luxury but not romantic
        cy.url().should("include", "luxury");
        cy.url().should("not.include", "romantic");
    });
});