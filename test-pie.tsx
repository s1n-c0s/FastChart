import React from 'react';
import { renderToString } from 'react-dom/server';
import { PieChart, Pie, Cell } from "recharts";

const data = [
  { name: "A", value: 0.2, color: "blue" },
  { name: "B", value: 0.5, color: "green" },
  { name: "C", value: 0.3, color: "red" }
];

const html = renderToString(
  <PieChart width={400} height={400}>
    <Pie
      data={data}
      dataKey="value"
      nameKey="name"
      startAngle={180}
      endAngle={0}
      cx="50%"
      cy="75%"
      innerRadius={150}
      outerRadius={350}
      stroke="none"
    >
      {data.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={entry.color} />
      ))}
    </Pie>
  </PieChart>
);
console.log(html);
