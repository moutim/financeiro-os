export default function LoadingSpinner({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: '80px 0',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '3px solid var(--separator)',
        borderTopColor: 'var(--blue)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-tertiary)', fontSize: 15, fontWeight: 500 }}>
        {message}
      </p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
