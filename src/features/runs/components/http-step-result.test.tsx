import { render, screen } from '@testing-library/react';
import { HttpStepResult } from './http-step-result';

describe('HTTP step result (Part 18, FR-18.12)', () => {
  it('shows status, masked final URL, duration, headers and truncation', () => {
    render(
      <HttpStepResult
        input={{ method: 'GET' }}
        output={{
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: { items: [] },
          bodyTruncated: true,
          durationMs: 850,
          finalUrl: 'https://api.example.com/items?api_key=SECRET&page=2',
        }}
      />,
    );
    expect(screen.getByText(/HTTP 200 OK/)).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/items?api_key=…&page=2')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('SECRET');
    expect(screen.getByText('850 ms')).toBeInTheDocument();
    expect(screen.getByText('Body truncated')).toBeInTheDocument();
    expect(screen.getByText('Response headers (1)')).toBeInTheDocument();
  });

  it('marks a 4xx kept as output as a failure in text, not only colour', () => {
    render(<HttpStepResult input={{}} output={{ status: 404, statusText: 'Not Found' }} />);
    expect(screen.getByText(/HTTP 404 Not Found/)).toBeInTheDocument();
  });

  it('renders nothing for an output without a status (e.g. an error)', () => {
    const { container } = render(<HttpStepResult input={{}} output={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
