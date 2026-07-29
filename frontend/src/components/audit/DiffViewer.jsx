/**
 * DiffViewer - Componente de comparação de mudanças (side-by-side)
 *
 * Recebe os objetos oldValues e newValues (armazenados como JSON no banco)
 * e renderiza apenas os campos que sofreram alteração ou inclusão,
 * destacando em vermelho (remoção/antigo) e verde (adição/novo).
 *
 * @param {Object} props
 * @param {Object|null} props.oldValues - Estado ANTES da alteração
 * @param {Object|null} props.newValues - Estado DEPOIS da alteração
 */
export function DiffViewer({ oldValues, newValues }) {
  const oldData = oldValues || {};
  const newData = newValues || {};

  // Coleta todas as chaves únicas presentes em ambos os objetos
  const allKeys = Array.from(
    new Set([...Object.keys(oldData), ...Object.keys(newData)])
  );

  if (allKeys.length === 0) {
    return <p className="diff-viewer-empty">Nenhum detalhe registrado.</p>;
  }

  // Formata valores para exibição (tratando objetos/arrays/nulos)
  const formatValue = (val) => {
    if (val === undefined || val === null) {
      return <em className="diff-viewer-null">vazio</em>;
    }
    if (typeof val === 'boolean') {
      return val ? 'Sim' : 'Não';
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  };

  return (
    <div className="diff-viewer">
      {/* Cabeçalho da grade */}
      <div className="diff-viewer-header">
        <span>Campo</span>
        <span>Valor Anterior</span>
        <span>Novo Valor</span>
      </div>

      {/* Linhas de diff */}
      <div className="diff-viewer-body">
        {allKeys.map((key) => {
          const oldVal = oldData[key];
          const newVal = newData[key];
          const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          return (
            <div
              key={key}
              className={`diff-viewer-row ${isChanged ? 'diff-viewer-changed' : 'diff-viewer-unchanged'}`}
            >
              <span className="diff-viewer-field">{key}</span>

              <span
                className={`diff-viewer-old ${
                  isChanged && oldVal !== undefined ? 'diff-viewer-old-highlight' : ''
                }`}
              >
                {formatValue(oldVal)}
              </span>

              <span
                className={`diff-viewer-new ${
                  isChanged && newVal !== undefined ? 'diff-viewer-new-highlight' : ''
                }`}
              >
                {formatValue(newVal)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}