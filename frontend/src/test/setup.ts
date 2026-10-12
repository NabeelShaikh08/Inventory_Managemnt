import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock SVG imports so they don't crash the test worker
vi.mock('../assets/alyafour-logo.svg', () => ({ default: 'logo.svg' }));
