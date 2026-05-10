const sectionColors = {
  schemes: "bg-blue-50 border-blue-200",
  jobs: "bg-emerald-50 border-emerald-200",
  farming: "bg-amber-50 border-amber-200",
};

function SectionCards({ labels, onSelect }) {
  const cards = [
    { key: "schemes", title: labels.schemesSection },
    { key: "jobs", title: labels.jobsSection },
    { key: "farming", title: labels.farmingSection },
  ];

  return (
    <div className="grid grid-cols-1 gap-3">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => onSelect(card.key)}
          className={`w-full cursor-pointer rounded-2xl border p-4 text-left text-base font-semibold text-slate-800 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] ${sectionColors[card.key]}`}
        >
          {card.title}
        </button>
      ))}
    </div>
  );
}

export default SectionCards;
