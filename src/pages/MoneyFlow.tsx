import * as React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StackedChart } from "@/components/charts";
import { useDataManipulation } from "@/hooks/useData";
import { INITIAL_DATA } from "@/config/constants";
import type { Datum } from "@/types";

export default function MoneyFlowPage() {
  const { data, setData, total, updateValue, updateLabel, updateColor } = useDataManipulation(INITIAL_DATA as Datum[]);
  const [showRadial, setShowRadial] = React.useState(false);
  const [showLabels, setShowLabels] = React.useState(false);
  const [isHorizontal, setIsHorizontal] = React.useState(true);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Money Flow</h1>
          <p className="text-sm text-muted-foreground">Visualize money flow across categories with a stacked / radial chart.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="show-labels" className="text-sm text-muted-foreground">Show labels</label>
            <Switch id="show-labels" checked={showLabels} onCheckedChange={setShowLabels} />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="show-radial" className="text-sm text-muted-foreground">Radial</label>
            <Switch id="show-radial" checked={showRadial} onCheckedChange={setShowRadial} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsHorizontal((v) => !v)}>{isHorizontal ? 'Horizontal' : 'Vertical'}</Button>
        </div>
      </div>

      <div className="rounded-lg border p-4 h-[520px]">
        <div className="h-full w-full">
          <StackedChart
            data={data}
            isHorizontal={isHorizontal}
            showLabels={showLabels}
            showRadial={showRadial}
          />
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Total: <span className="font-mono">{total.toLocaleString()}</span></div>
          <div className="text-xs text-muted-foreground">Tip: edit values in Data Visualizer to see them here live.</div>
        </div>
      </div>
    </div>
  );
}
