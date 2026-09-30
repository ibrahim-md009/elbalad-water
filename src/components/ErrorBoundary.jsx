import { Component } from 'react';

/** بدل الصفحة الفاضية: يعرض الأرور الحقيقي (اسمه ومكانه) */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div dir="rtl" style={{ padding: 24, color: '#fff', fontFamily: 'sans-serif' }}>
        <h2>حصل خطأ في الصفحة</h2>
        <p>{String(error?.message || error)}</p>
        <pre style={{ whiteSpace: 'pre-wrap', direction: 'ltr', fontSize: 12, opacity: 0.8 }}>
          {this.state.error?.stack?.split('\n').slice(0, 6).join('\n')}
        </pre>
        <button type="button" onClick={() => window.location.reload()}>إعادة تحميل</button>
      </div>
    );
  }
}
