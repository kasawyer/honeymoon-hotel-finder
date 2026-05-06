describe("Search & Results Page", () => {
    it("shows the search bar prefilled with location", () => {
        cy.visit("/results?location=Paris&keywords=romantic,honeymoon");
        cy.get('input[placeholder*="honeymoon"]').should("have.value", "Paris");
    });

    it("displays autocomplete suggestions when typing", () => {
        // Intercept the autocomplete API call
        cy.intercept("GET", "/api/v1/locations*", {
            statusCode: 200,
            body: {
                locations: [
                    { place_id: "abc", description: "Paris, France" },
                    { place_id: "def", description: "Paris, TX, USA" },
                ],
            },
        }).as("autocomplete");

        cy.visit("/");
        cy.get('input[placeholder*="honeymoon"]').type("Paris");

        cy.wait("@autocomplete");
        cy.contains("Paris, France").should("be.visible");
        cy.contains("Paris, TX, USA").should("be.visible");
    });

    it("selects an autocomplete suggestion", () => {
        cy.intercept("GET", "/api/v1/locations*", {
            statusCode: 200,
            body: {
                locations: [{ place_id: "abc", description: "Paris, France" }],
            },
        }).as("autocomplete");

        cy.visit("/");
        cy.get('input[placeholder*="honeymoon"]').type("Paris");

        cy.wait("@autocomplete");
        cy.contains("Paris, France").click();

        cy.get('input[placeholder*="honeymoon"]').should("have.value", "Paris, France");
    });
});