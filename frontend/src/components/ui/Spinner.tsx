/** Spinner acessível (estilos em styles/base.css). */
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Carregando"
    />
  );
}

/** Spinner centralizado para telas inteiras (splash de rotas protegidas). */
export function FullPageSpinner() {
  return (
    <div className="page-state">
      <Spinner size={32} />
      <p>Carregando…</p>
    </div>
  );
}
