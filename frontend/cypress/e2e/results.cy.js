describe("Results Page with Mocked SSE", () => {
    it("shows progress indicator on initial load", () => {
        cy.visit("/results?location=Paris&keywords=romantic");
        // The progress bar should appear while trying to connect
        cy.contains("Starting search").should("exist");
    });

    it("has grid and map view toggle buttons", () => {
        cy.visit("/results?location=Paris&keywords=romantic");

        cy.get('[title="Grid view"]').should("exist");
        cy.get('[title="Map view"]').should("exist");
    });

    it("allows starting a new search from results page", () => {
        cy.intercept("GET", "/api/v1/locations*", {
            statusCode: 200,
            body: {
                locations: [{ place_id: "abc", description: "Bali, Indonesia" }],
            },
        }).as("autocomplete");

        cy.visit("/results?location=Paris&keywords=romantic");

        // Clear and type new search
        cy.get('input[placeholder*="honeymoon"]').clear().type("Bali");
        cy.wait("@autocomplete");
        cy.contains("Bali, Indonesia").click();
        cy.get('input[placeholder*="honeymoon"]').type("{enter}");

        cy.url().should("include", "location=Bali");
    });

    it("prefills the search bar with the location from URL", () => {
        cy.visit("/results?location=Santorini&keywords=romantic");
        cy.get('input[placeholder*="honeymoon"]').should("have.value", "Santorini");
    });
});