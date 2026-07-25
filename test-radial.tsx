import React from 'react';
import { renderToString } from 'react-dom/server';
import { RadialBarChart, RadialBar } from "recharts";

const data = [{ "A": 0.2, "B": 0.5, "C": 0.3 }];

try {
  const html = renderToString(
    <RadialBarChart width={400} height={400} data={data}>
      <RadialBar dataKey="A" />
      <g>
        <text>Test</text>
      </g>
    </RadialBarChart>
  );
  console.log("SUCCESS");
} catch (e) {
  console.log("ERROR", e.message);
}
