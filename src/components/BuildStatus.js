import { useEffect, useState } from 'react';
import Convert from 'ansi-to-html';
import { LineChart } from '@mui/x-charts/LineChart';

import Card from './Card.js';
import CodeBlock from './CodeBlock.js';
import useDarkMode from './useDarkMode.js';
import { formatDuration, formatBytes } from '../utils.js';

export function BuildStatus({ requestId }) {
  const darkMode = useDarkMode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const result = await fetch(`${import.meta.env.VITE_BLOB_URL}status/${requestId}.json`);
        const data = await result.json();
        const convert = new Convert();
        setData({
          shell: convert.toHtml(data
            .filter(x => x.msg === 'Circomkit Log')
            .map(x => x.data.msg)
            .join('\n\n')),
          duration: data[data.length - 1].time.toFixed(2),
          memory: data
            .filter(x => ['Circom memory usage', 'Memory Usage Update'].indexOf(x.msg) !== -1)
            .map(x => ({
              memory: x.data.memoryUsage ? x.data.memoryUsage * 1024 : x.data.memory.rss,
              disk: x.data.disk ? Number(x.data.disk.find(x => x.Mounted === '/tmp').Used) * 1024 : 0,
              time: x.time,
            })),
        });
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, []);

  return (<>
    {loading && <Card>Loading build status...</Card>}
    {error && <Card>Error loading build status!</Card>}
    {data && <Card fullWidth={true}>
      {data.memory.length > 0 && <>
        <p className="text-l font-bold">Compilation Duration: {formatDuration(data.duration)}</p>
        <LineChart
          xAxis={[
            {
              dataKey: 'time',
              valueFormatter: (value) => formatDuration(value),
            },
          ]}
          yAxis={[
            {
              valueFormatter: (value) => formatBytes(value),
            },
          ]}
          margin={{ top: 20, right: 20, bottom: 40, left: 70 }}
          slotProps={{
            legend: {
              direction: 'row',
              position: { vertical: 'top', horizontal: 'right' },
              padding: 0,
              labelStyle: {
                fill: darkMode ? '#eee' : '#000',
              }
            },
          }}
          series={[
            {
              dataKey: 'memory',
              label: 'Memory',
              valueFormatter: (value) => `Memory: ${formatBytes(value)}`,
            },
            {
              dataKey: 'disk',
              label: 'Disk',
              valueFormatter: (value) => `Disk: ${formatBytes(value)}`,
            },
          ]}
          height={300}
          dataset={data.memory}
          />
        </>}
      <pre
        className={`
          max-w-full overflow-x-auto
          language-shell
        `}
        dangerouslySetInnerHTML={{ __html: data.shell }}
        />
    </Card>}
  </>);
}
