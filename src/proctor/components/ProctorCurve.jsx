/**
 * On-screen Proctor curve. Renders the SAME chart model the PDF uses, in the same
 * template coordinate space (viewBox = the template's chart frame), so what the user
 * sees here is geometrically what lands on the report.
 */
import { useMemo } from 'react';
import { Section } from './Fields.jsx';
import { generateProctorGraph } from '../chart/proctorChart.js';
import { PROCTOR_TEMPLATE_POSITIONS } from '../pdf/proctorTemplateConfig.js';
import { formatFixed, PRECISION } from '../utils/formatters.js';

const C = PROCTOR_TEMPLATE_POSITIONS.chart;
const SERIF = '"Times New Roman", Times, serif';

export default function ProctorCurve({ results, ready }) {
  const model = useMemo(() => generateProctorGraph(results.trials, results.peakIndex), [results]);
  const { frame, plot } = C;
  const w = frame.right - frame.left;
  const h = frame.bottom - frame.top;
  // Horizontal gridlines: 7 lines; vertical: every xGridSpacing from the left edge.
  const hLines = Array.from({ length: C.yIntervals + 1 }, (_, i) => plot.top + (i * (plot.bottom - plot.top)) / C.yIntervals);
  const vLines = [];
  for (let x = plot.left; x <= plot.right + 0.01; x += C.xGridSpacing) vLines.push(x);

  const plotted = model.points.length;
  return (
    <Section number={5} title="Proctor Curve" subtitle="Dry density vs moisture content. The highlighted point is the MDD / OMC.">
      <figure className="pct-chart">
        <svg
          viewBox={`${frame.left} ${frame.top} ${w} ${h}`}
          role="img"
          aria-label={
            model.peak
              ? `Proctor compaction curve with ${plotted} points; peak at ${model.peak.label} g/cc and ${formatFixed(model.peak.mc, PRECISION.omc)} % moisture`
              : 'Proctor compaction curve (no data yet)'
          }
          fontFamily={SERIF}
        >
          <rect x={frame.left} y={frame.top} width={w} height={h} fill="#fff" stroke="#D9D9D9" strokeWidth="0.75" />
          <text x={(frame.left + frame.right) / 2} y={432} textAnchor="middle" fontSize="9.8" fill="#595959">Proctor Compaction Curve</text>
          {hLines.map((y) => <line key={`h${y}`} x1={plot.left} x2={plot.right} y1={y} y2={y} stroke={C.gridLine.color} strokeWidth={C.gridLine.width} />)}
          {vLines.map((x) => <line key={`v${x}`} x1={x} x2={x} y1={plot.top} y2={plot.bottom} stroke={C.gridLine.color} strokeWidth={C.gridLine.width} />)}
          <text transform={`translate(111.5 ${(plot.top + plot.bottom) / 2}) rotate(-90)`} textAnchor="middle" fontSize="8.2" fill="#595959">Density g/cc</text>
          <text x={(plot.left + plot.right) / 2} y={571.5} textAnchor="middle" fontSize="8.2" fill="#595959">Moisture Content %</text>

          {model.empty ? (
            <text x={(plot.left + plot.right) / 2} y={(plot.top + plot.bottom) / 2} textAnchor="middle" fontSize="9" fill="#8a8a8a">
              Enter trial readings to plot the curve
            </text>
          ) : (
            <>
              <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} stroke={C.axisLine.color} strokeWidth={C.axisLine.width} />
              <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke={C.axisLine.color} strokeWidth={C.axisLine.width} />
              {model.yTicks.map((t) => (
                <text key={t.label} x={C.yTickLabel.rightX} y={t.y + C.yTickLabel.dy} textAnchor="end" fontSize={C.yTickLabel.size} fill={C.yTickLabel.color}>{t.label}</text>
              ))}
              {model.xTicks.map((t) => (
                <text key={t.label} x={t.x} y={C.xTickLabel.y} textAnchor="middle" fontSize={C.xTickLabel.size} fill={C.xTickLabel.color}>{t.label}</text>
              ))}
              {C.peak.show && C.peak.showGuides && model.peak && ready && (
                <line x1={model.peak.x} x2={model.peak.x} y1={model.peak.y} y2={plot.bottom} stroke={C.peak.guideColor} strokeWidth={C.peak.guideWidth} strokeDasharray={C.peak.guideDash.join(' ')} />
              )}
              <path d={model.curve.d} fill="none" stroke={C.curve.color} strokeWidth={C.curve.width} strokeLinejoin="round" strokeLinecap="round" />
              {model.points.map((p) => (
                <g key={p.trial}>
                  {/* Invisible hit target with a native tooltip for exact values */}
                  <circle cx={p.x} cy={p.y} r="6" fill="transparent">
                    <title>{`Trial ${p.trial}: ${formatFixed(p.mc, PRECISION.omc)} %, ${p.label} g/cc`}</title>
                  </circle>
                  <text x={p.x} y={p.y + C.dataLabel.dy} textAnchor="middle" fontSize={C.dataLabel.size} fill={C.dataLabel.color}>{p.label}</text>
                </g>
              ))}
              {C.peak.show && model.peak && ready && (
                <circle cx={model.peak.x} cy={model.peak.y} r={C.peak.markerRadius} fill={C.peak.markerColor} pointerEvents="none" />
              )}
            </>
          )}
        </svg>
        {model.peak && ready && (
          <figcaption className="pct-chart__cap">
            Peak: Trial {model.peak.trial} — MDD {model.peak.label} g/cm³ at OMC {formatFixed(model.peak.mc, PRECISION.omc)} %
          </figcaption>
        )}
      </figure>
    </Section>
  );
}
