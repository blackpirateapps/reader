import { Palette, PenLine, Type } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import SegmentedControl from "../components/SegmentedControl.jsx";

export default function SettingsView({ settings, updateSetting }) {
  return (
    <div className="view">
      <PageHeader
        title="Settings"
        subtitle="Shape the reading experience to your taste."
      />
      <section className="card">
        <div className="settings-grid">
          <div className="setting">
            <label>
              <Palette size={16} /> Theme
            </label>
            <SegmentedControl
              options={[
                { value: "light", label: "Light" },
                { value: "ink", label: "Ink" },
              ]}
              value={settings.theme}
              onChange={(value) => updateSetting("theme", value)}
            />
          </div>
          <div className="setting">
            <label>
              <Type size={16} /> Typeface
            </label>
            <SegmentedControl
              options={[
                { value: "serif", label: "Serif" },
                { value: "sans", label: "Sans" },
              ]}
              value={settings.font}
              onChange={(value) => updateSetting("font", value)}
            />
          </div>
          <div className="setting">
            <label>
              <PenLine size={16} /> Weight
            </label>
            <SegmentedControl
              options={[
                { value: "400", label: "Regular" },
                { value: "600", label: "Bold" },
              ]}
              value={settings.weight}
              onChange={(value) => updateSetting("weight", value)}
            />
          </div>
          <div className="setting">
            <label>Base Size ({settings.size}px)</label>
            <input
              className="range"
              type="range"
              min="14"
              max="24"
              value={settings.size}
              onChange={(event) =>
                updateSetting("size", Number(event.target.value))
              }
            />
          </div>
          <div className="preview-card">
            <div className="reader-body">
              <p>
                This is a preview of how your saved articles will feel. The quick
                brown fox jumps over the lazy dog.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
