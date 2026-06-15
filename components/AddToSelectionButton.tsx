"use client";

type AddToSelectionButtonProps = {
  isSelected: boolean;
  onToggle: () => void;
};

export function AddToSelectionButton({
  isSelected,
  onToggle
}: AddToSelectionButtonProps) {
  return (
    <div className="space-y-2">
      {isSelected ? (
        <p className="text-center text-sm font-black uppercase tracking-[0.16em] text-terra-leaf">
          Seleccionado
        </p>
      ) : null}
      <button
        className={`min-h-16 w-full rounded-lg px-4 text-center text-lg font-black leading-tight shadow-soft transition sm:text-xl ${
          isSelected
            ? "border border-terra-moss/30 bg-white text-terra-ink hover:bg-terra-paper"
            : "bg-[#1f8f4d] text-white hover:bg-[#187a40]"
        }`}
        onClick={onToggle}
        type="button"
      >
        {isSelected ? "Quitar de mi selecci\u00f3n" : "Agregar a mi selecci\u00f3n"}
      </button>
    </div>
  );
}
