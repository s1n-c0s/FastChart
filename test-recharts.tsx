import React from 'react';
import { renderToString } from 'react-dom/server';
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

const data = [{ "A": 0.2, "B": 0.5, "C": 0.3 }];

const html = renderToString(
  <RadialBarChart width={400} height={400} data={data} startAngle={180} endAngle={0} innerRadius={150} outerRadius={350}>
    <PolarAngleAxis type="number" domain={[0, 1]} angleAxisId={0} tick={false} />
    <RadialBar dataKey="A" stackId="a" fill="blue" />
    <RadialBar dataKey="B" stackId="a" fill="green" />
    <RadialBar dataKey="C" stackId="a" fill="red" />
  </RadialBarChart>
);
console.log(html);
