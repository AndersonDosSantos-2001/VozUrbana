import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

const CORES_OFICIAIS = [
  '#EA580C', // Coral Cívico
  '#1E293B', // Azul Urbano
  '#3B82F6', // Azul Progresso
  '#10B981', // Verde Zeladoria
  '#64748B', // Slate Urbano
  '#F59E0B', // Âmbar Alerta
];

function TooltipCustomizado({ active, payload, metrica }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-urbano text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700 text-xs">
      <p className="font-display font-bold">{item.nome}</p>
      <p className="text-slate-300 mt-0.5">
        {metrica === 'curtidas'
          ? `${item.total_curtidas} apoios acumulados`
          : `${item.total_denuncias} denúncias (${item.percentual}%)`}
      </p>
    </div>
  );
}

/**
 * Gráfico de Rosca / Pizza (PieChart) alimentado pelos dados agregados do Dashboard.
 */
export function GraficoPizza({ dados = [], metrica = 'denuncias' }) {
  const chaveValor = metrica === 'curtidas' ? 'total_curtidas' : 'total_denuncias';
  const dadosValidos = dados.filter((d) => Number(d[chaveValor]) > 0);

  if (dadosValidos.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400">
        Sem dados suficientes para o gráfico de rosca.
      </div>
    );
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dadosValidos}
            dataKey={chaveValor}
            nameKey="nome"
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={68}
            paddingAngle={3}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {dadosValidos.map((item, idx) => (
              <Cell
                key={`cell-${item.categoria_id || idx}`}
                fill={item.cor_hex || CORES_OFICIAIS[idx % CORES_OFICIAIS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<TooltipCustomizado metrica={metrica} />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default GraficoPizza;
