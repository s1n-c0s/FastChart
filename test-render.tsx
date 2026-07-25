import React from 'react';
import { renderToString } from 'react-dom/server';
import { StackedChart } from './src/components/charts/stacked-chart';

const data = [
  { id: '1', label: 'A', value: 10, color: 'red' },
  { id: '2', label: 'B', value: 20, color: 'blue' }
];

try {
  const html = renderToString(
    <StackedChart data={data} showRadial={true} />
  );
  console.log("RENDER SUCCESS", html.substring(0, 100));
} catch (e) {
  console.error("RENDER ERROR:", e);
}
