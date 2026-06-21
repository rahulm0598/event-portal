import { Component } from 'react';

// Catches any render/runtime crash so a single bad page never blanks the app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }
  reset = () => {
    this.setState({ error: null });
    // hard-reload as a last resort to clear any stuck native state (camera etc.)
    if (typeof window !== 'undefined') window.location.assign('/');
  };
  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-ink p-6 text-center">
          <div className="card max-w-md">
            <h1 className="text-xl font-extrabold text-white">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-400">{String(this.state.error?.message || this.state.error)}</p>
            <button onClick={this.reset} className="btn-primary mt-5">Reload app</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
