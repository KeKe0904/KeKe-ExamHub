import { Sun, Moon } from "@/components/MathIcon";
import { useThemeStore } from "@/store/themeStore";

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "切换到白天模式" : "切换到黑夜模式"}
      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-950 hover:text-black dark:hover:text-white transition-colors"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}
