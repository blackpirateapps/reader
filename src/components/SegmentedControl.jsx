export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.icon ? <option.icon size={16} /> : null}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
