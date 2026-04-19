import React from 'react';
export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, info: null }; }
  componentDidCatch(error, info) { this.setState({ hasError: true, error, info }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{background:'red', color:'white', padding:'20px', zIndex:9999, position:'fixed', top:0, left:0, bottom:0, right:0, overflow:'auto'}}>
          <h2>Crash Error:</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.info && this.state.info.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
