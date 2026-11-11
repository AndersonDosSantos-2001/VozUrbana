import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

const CORES_OFICIAIS = [
  '#1E293B',
  '#EA580C',
  '#3B82F6',
  '#10B981',
  '#64748B',
  '#F59E0B',
];

function TooltipColunas({ active, payload, metrica }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-urbano text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700 text-xs">
      <p className="font-display font-bold">{item.nome || item.bairro}</p>
      <p className="text-slate-300 mt-0.5">
        {metrica === 'curtidas'
          ? `${item.total_curtidas} apoios`
          : `${item.total_denuncias} ocorrências`}
      </p>
    </div>
  );
}

/**
 * Gráfico de Colunas (BarChart) para comparar volume de denúncias ou curtidas por categoria.
 */
export function GraficoColunas({ dados = [], metrica = 'denuncias' }) {
  const chaveValor = metrica === 'curtidas' ? 'total_curtidas' : 'total_denuncias';

  const dadosFormatados = dados.map((item) => ({
    ...item,
    rotuloCurto: String(item.nome || item.bairro || '')
      .split(' ')
      .slice(0, 2)
      .join(' '),
  }));

  if (dadosFormatados.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400">
        Sem dados suficientes para o gráfico de colunas.
      </div>
    );
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dadosFormatados}
          margin={{ top: 10, right: 6, left: -24, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="rotuloCurto"
            tick={{ fontSize: 10, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9' }}
            content={<TooltipColunas metrica={metrica} />}
          />
          <Bar dataKey={chaveValor} radius={[6, 6, 0, 0]} maxBarSize={34}>
            {dadosFormatados.map((item, idx) => (
              <Cell
                key={`bar-${item.categoria_id || idx}`}
                fill={item.cor_hex || CORES_OFICIAIS[idx % CORES_OFICIAIS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default GraficoColunas;
