// src/test/setup.js
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Automatically unmount and clean up after each test
afterEach(() => {
  cleanup();
});
