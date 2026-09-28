import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the EduNexus app without crashing', () => {
  render(<App />);
  expect(screen.getAllByText(/edunexus/i).length).toBeGreaterThan(0);
});
