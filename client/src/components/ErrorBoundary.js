import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, R, GRAD, g } from '../theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Something went wrong' };
  }

  componentDidCatch(error, info) {
    // Log to console in dev — swap for a real logger in production
    console.error('[QuizJex Error]', error.message, info?.componentStack);
  }

  reset() {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) this.props.onReset();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <LinearGradient colors={GRAD.bg} style={g.center}>
        <Text style={styles.icon}>😬</Text>
        <Text style={[g.h2, { textAlign: 'center', marginBottom: S.sm }]}>
          Oops! Something went wrong
        </Text>
        <Text style={[g.muted, { textAlign: 'center', marginBottom: S.xl, paddingHorizontal: S.lg }]}>
          Don't worry — it happens to the best of us! Try going back to the home screen.
        </Text>
        <TouchableOpacity
          style={[g.btn, { backgroundColor: C.purple, paddingHorizontal: S.xl }]}
          onPress={() => this.reset()}
          activeOpacity={0.85}
        >
          <Text style={g.btnText}>🏠 Go Home</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }
}

const styles = StyleSheet.create({
  icon: { fontSize: 80, marginBottom: S.md },
});
