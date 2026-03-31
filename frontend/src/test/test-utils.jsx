// src/test/test-utils.jsx
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Wraps components in BrowserRouter since many components use Link/useNavigate
export function renderWithRouter(ui, options = {}) {
    return render(ui, {
        wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
        ...options,
    });
}

export * from "@testing-library/react";
export { renderWithRouter };