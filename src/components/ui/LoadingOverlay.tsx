export default function LoadingOverlay() {
  return (
    <div className="animate-fade-in" style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      borderRadius: 'inherit',
    }}>
      <div style={{
        background: 'rgba(30, 30, 35, 0.75)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        width: 80,
        height: 80,
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '3.5px solid rgba(255,255,255,0.15)',
          borderTopColor: '#FFFFFF',
          animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }} />
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
