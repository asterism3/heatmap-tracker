import { View } from "./types";
import { useHeatmapContext } from "./context/heatmap/heatmap.context";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { HeatmapTrackerView } from "./views/HeatmapTrackerView/HeatmapTrackerView";
import { StatisticsView } from "./views/StatisticsView/StatisticsView";
import { HeatmapHeader } from "./components/HeatmapHeader/HeatmapHeader";

export const ReactApp = () => {
  const { i18n } = useTranslation();
  const { currentYear, settings, view, setView } = useHeatmapContext();

  useEffect(() => {
    if (view !== View.HeatmapTracker) {
      setView(View.HeatmapTracker);
    }
  }, []);

  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings]);

  if (!currentYear) {
    return null;
  }

  return (
    <div className="heatmap-tracker__container">
      <HeatmapHeader />
      {view === View.HeatmapTracker ? (
        <HeatmapTrackerView />
      ) : view === View.HeatmapTrackerStatistics ? (
        <StatisticsView />
      ) : (
        <div>
          <div>Menu</div>
          <div>
            If you find this plugin useful, you can buy me a coffee! Your
            support helps keep this project alive. ☕💖
          </div>
          <div>
            <a href="https://www.buymeacoffee.com/mrubanau">
              <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=mrubanau&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
