'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type SpreadsheetErrorBoundaryProps = {
  children: ReactNode;
  onError?: (error: Error) => void;
};

type SpreadsheetErrorBoundaryState = { error: Error | null };

export class SpreadsheetErrorBoundary extends Component<SpreadsheetErrorBoundaryProps, SpreadsheetErrorBoundaryState> {
  state: SpreadsheetErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SpreadsheetErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void errorInfo;
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert">
          <p>The spreadsheet workspace could not be displayed.</p>
          <button type="button" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
