import { Component } from 'react';
import { reportError } from '../services/monitoring';

/** Last line of defence: reports render errors to Sentry and shows a recovery screen. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info.componentStack });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main id="main" className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted">
            The error has been reported. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="mt-6 rounded-xl bg-accent px-4 py-2 font-medium text-white"
          >
            Back to home
          </button>
        </div>
      </main>
    );
  }
}
