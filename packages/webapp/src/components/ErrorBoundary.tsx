import { Component, type ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] Render error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div class="loading" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Render Error</div>
          <div style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', wordBreak: 'break-word' }}>
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
