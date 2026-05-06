describe("Home Page", () => {
    beforeEach(() => {
        cy.visit("/");
    });

    it("displays the hero heading", () => {
        cy.contains("Find Your Dream Honeymoon Hotel").should("be.visible");
    });

    it("displays the search bar with placeholder", () => {
        cy.get('input[placeholder*="honeymoon"]').should("be.visible");
    });

    it("displays keyword filter buttons", () => {
        cy.contains("Romantic").should("be.visible");
        cy.contains("Honeymoon").should("be.visible");
        cy.contains("Anniversary").should("be.visible");
        cy.contains("Luxury").should("be.visible");
        cy.contains("Spa").should("be.visible");
    });

    it("displays popular destination buttons", () => {
        cy.contains("Maldives").should("be.visible");
        cy.contains("Santorini").should("be.visible");
        cy.contains("Bali").should("be.visible");
        cy.contains("Paris").should("be.visible");
    });

    it("displays the header with logo", () => {
        cy.contains("Honeymoon Hotel Finder").should("be.visible");
    });

    it("navigates to results when searching", () => {
        cy.get('input[placeholder*="honeymoon"]').type("Paris{enter}");
        cy.url().should("include", "/results");
        cy.url().should("include", "location=Paris");
    });

    it("navigates to results when clicking a popular destination", () => {
        cy.contains("button", "Maldives").click();
        cy.url().should("include", "/results");
        cy.url().should("include", "location=Maldives");
    });

    it("includes selected keywords in the URL", () => {
        // Default keywords are romantic, honeymoon, anniversary
        cy.get('input[placeholder*="honeymoon"]').type("Bali{enter}");
        cy.url().should("include", "keywords=");
    });

    it("allows toggling keyword filters", () => {
        // Click Luxury to add it
        cy.contains("button", "Luxury").click();
        // Click Romantic to remove it
        cy.contains("button", "Romantic").click();

        // Search and verify URL
        cy.get('input[placeholder*="honeymoon"]').type("Paris{enter}");
        cy.url().should("include", "luxury");
        cy.url().should("not.include", "romantic");
    });

    it("navigates home when clicking the logo", () => {
        // First navigate away
        cy.get('input[placeholder*="honeymoon"]').type("Paris{enter}");
        cy.url().should("include", "/results");

        // Click logo to go home
        cy.contains("Honeymoon Hotel Finder").click();
        cy.url().should("eq", Cypress.config().baseUrl + "/");
    });
});